import { PropertyMutation, Mutation, SubpropertyMutation, invertMutation } from './mutations';
import { WatchType, ListenableCollection, IListenable } from './types';
import { Observable, Subject, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EpoxyGlobalState } from './global-state';

/**
 * Base class for all data structure proxy handlers.
 */
export abstract class BaseProxyHandler<T extends object> implements ProxyHandler<T> {
    constructor(
        protected listenFunction: (input: WatchType) => any,
    ) {}

    protected output: ListenableCollection;
    public setOutput(output: ListenableCollection) {
        this.output = output;
    }

    public debugLabel: string;

    protected mutations: Subject<Mutation<T>> = new Subject();
    protected subpropertySubscriptions: {[key: string]: Subscription, [key: number]: Subscription} = {};
    private subpropertyKeys: Map<Symbol, PropertyKey> = new Map();


    // WATCH SUBPROPERTY CHANGES

    protected watchSubpropertyChanges(key: PropertyKey, value: WatchType) {
        const keySymbol = Symbol();
        this.subpropertyKeys.set(keySymbol, key);

        if (this.subpropertySubscriptions[key] !== undefined) {
            delete this.subpropertySubscriptions[key];
        }

        if ((value instanceof Array) || (value instanceof Object)) {
            this.subpropertySubscriptions[key] = (value as IListenable<any>)
                .listen()
                .subscribe((mutation) => {
                    const currentKey = this.subpropertyKeys.get(keySymbol);
                    this.mutations.next(new SubpropertyMutation(currentKey, mutation));
                })
        }
    }

    protected removeSubpropertyWatcher(subpropertyKey: PropertyKey) {
        if (!this.subpropertySubscriptions[subpropertyKey]) return;
        this.subpropertySubscriptions[subpropertyKey].unsubscribe();
        delete this.subpropertySubscriptions[subpropertyKey];
    }

    protected clearSubpropertyWatchers() {
        Object.keys(this.subpropertySubscriptions).forEach((subpropertyKey) => {
            this.removeSubpropertyWatcher(subpropertyKey);
        });
    }

    /**
     * In arrays and related data structures the key (index) of a particular property can change over time.
     * For example, if you have an array of [item1, itemA] and you call array.splice(1, 0, itemAlpha), the
     * key of itemA will change from 1 to 2. This function allows subproperty watchers to update their keys
     * without needing to resubscribe.
     * @param mapperFunction Returns the new key that an existing one should map to, or null if the specific
     *  subproperty was deleted (which will cause removeSubpropertyWatcher() to be called automatically).
     */
    protected remapSubpropertyKeys(mapperFunction: (currentKey: PropertyKey) => PropertyKey | null) {
        const newSubpropertyKeys = new Map<Symbol, PropertyKey>();
        this.subpropertyKeys.forEach((currentKey: PropertyKey, symbol: Symbol) => {
            const newKey = mapperFunction(currentKey);
            if (newKey === null) {
                this.removeSubpropertyWatcher(currentKey);
            } else {
                newSubpropertyKeys.set(symbol, newKey);
            }
        });
        this.subpropertyKeys = newSubpropertyKeys;
    }


    // OBSERVING PROPERTIES

    observables<U extends ListenableCollection>(): U {
        return new Proxy(this.output, {
            get: (target: U, key: PropertyKey) => {
                return this.getObservable(target, key);
            },

            set: (target: U, key: PropertyKey, value: any) => {
                throw new Error('Cannot set properties on a collection\'s observables');
            }
        }) as U;
    }

    getObservable<U>(target: object, key: PropertyKey): Observable<U> {
        const initialValue = target[key] as U;
        const initialCollectionValue = ((initialValue as any) as ListenableCollection);
        
        let streamObservable: Observable<U>;
        if (initialCollectionValue && initialCollectionValue.asObservable) {
            streamObservable = (initialCollectionValue.asObservable() as any) as Observable<U>;
            
        } else {
            streamObservable = this.output.listen().pipe(
                filter((mutation) => mutation.key == key &&
                                     mutation instanceof PropertyMutation ||
                                     mutation instanceof SubpropertyMutation),
                map((mutation) => target[key])
            );
        }

        return Observable.concat(
            Observable.of(initialValue),
            streamObservable
        );
    }


    // OVERRIDABLE DATA FUNCTIONS

    protected abstract copyData(target: T);

    protected applyMutation(target: T, mutation: Mutation<any>) {
        if (mutation instanceof SubpropertyMutation) {
            target[mutation.key].applyMutation(mutation.mutation);
        } else if (mutation instanceof PropertyMutation) {
            target[mutation.key] = mutation.newValue;
        } else {
            throw new Error('Could not apply mutation: Unknown or invalid mutation type');
        }
    }


    // PROXY FUNCTIONS

    get(target: T, property: PropertyKey) {
        // Implement IListenableArray functions.
        if (this.LISTENABLE_FUNCTION_IMPL.hasOwnProperty(property)) {
            let value = this.LISTENABLE_FUNCTION_IMPL[property];
            if (value instanceof Function) {
                value = value.bind(this, target);
            }
            return value;
        }

        EpoxyGlobalState.registerGetterCall(this.output, property);
    }


    // ILISTENABLE FUNCTIONALITY

    private LISTENABLE_FUNCTION_IMPL = {
        /**
         * Returns a stream of all mutation events on this Array instance, including changes to any
         * of its subproperties.
         */
        listen() {
            return this.mutations.asObservable();
        },
        
        /**
         * Returns an observable that updates whenever this data structure is mutated in any way.
         * Note that this involves making shallow copies and so should be used sparingly.
         */
        asObservable(target: T) {
            return this.mutations.map((m) => this.copyData(target));
        },
        
        /**
         * Returns an Array that contains the same data as this array, except all of its properties
         * are observables rather than raw values. This is useful for plugging the structure into
         * consumers such as UI frameworks. 
         */
        observables() {
            return this.observables();
        },

        /**
         * Applies a given mutation to this collection.
         */
        applyMutation(target: T, mutation: Mutation<any>) {
            this.applyMutation(target, mutation);
        },

        /**
         * Applies the opposite of a given mutation to this collection, undoing the change.
         */
        unapplyMutation(target: T, mutation: Mutation<any>) {
            this.applyMutation(target, invertMutation(mutation));
        },

        /**
         * Gives this listenable a unique value that can be displayed in debug tools.
         */
        debugWithLabel(label: string) {
            const hadPreviousLabel = !!this.debugLabel;
            this.debugLabel = label;
            if (!hadPreviousLabel) {
                this.mutations.subscribe((mutation) => {
                    EpoxyGlobalState.logDebugMutation(this.debugLabel, mutation);
                });
            }
        }
    } as IListenable<T>;
}