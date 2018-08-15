import { Observable, Subject, Subscription, concat, of, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { PropertyMutation, Mutation, SubpropertyMutation, invertMutation, ValueMutation } from './mutations';
import { WatchType, ListenableCollection, IGenericListenable, TypedObject, IListenableArray, ListenableSignifier } from './types';
import { EpoxyGlobalState, BatchingState } from './global-state';
import { computed } from './runners';
import { ReadonlyArrayProxyHandler, ReadonlyProxyHandler } from './readonly-proxy';
import { MutationSequence } from './mutation-sequence';

/**
 * Base class for all data structure proxy handlers.
 */
export abstract class BaseProxyHandler<T extends object> implements ProxyHandler<T> {
    public debugLabel: string = '';

    constructor(
        protected listenFunction: (input: WatchType) => any,
    ) {}

    protected output: ListenableCollection;
    public setOutput(output: ListenableCollection) {
        this.output = output;
    }

    private cachedObservable: Observable<T>;
    private valueSubject: Subject<T> = new Subject();
    protected get outputAsObservable() {
        if (!this.cachedObservable) {
            this.cachedObservable = merge(
                this.output.listen().pipe(
                    map(() => this.copyData(this.output as T))
                ),
                this.valueSubject.asObservable());
        }
        return this.cachedObservable;
    }

    protected changeSubject: Subject<T> = new Subject();
    protected mutations: Subject<Mutation<T>> = new Subject();
    
    // Stream subscriptions to IListenable instances or Observalbes contained in this structure.
    protected propertySubscriptions: TypedObject<Subscription> = {};

    // Allows subscription functions to be mapped to their current property key.
    private propertyKeys: Map<Symbol, PropertyKey> = new Map();

    // WATCH SUBPROPERTY CHANGES

    protected watchSubpropertyChanges(target: T, key: PropertyKey, value: WatchType | Observable<any>) {
        const keySymbol = Symbol();
        this.propertyKeys.set(keySymbol, key);

        if (value instanceof Observable) {
            return this.watchObservableProperty(target, key, value);
        }

        if (this.propertySubscriptions[key] !== undefined) {
            this.propertySubscriptions[key].unsubscribe();
            delete this.propertySubscriptions[key];
        }

        if ((value instanceof Array) || (value instanceof Object)) {
            this.propertySubscriptions[key] = (value as IGenericListenable)
                .listen()
                .subscribe((mutation) => {
                    const currentKey = this.propertyKeys.get(keySymbol);
                    this.broadcastMutation(target, new SubpropertyMutation(currentKey, mutation));
                })
        }
    }

    protected watchObservableProperty(target: T, key: PropertyKey, value: Observable<any>) {
        const keySymbol = Symbol();
        this.propertyKeys.set(keySymbol, key);

        if (this.propertySubscriptions[key] !== undefined) {
            this.propertySubscriptions[key].unsubscribe();
            delete this.propertySubscriptions[key];
        }

        if ((value instanceof Array) || (value instanceof Object)) {
            this.propertySubscriptions[key] = value.subscribe((newValue) => {
                const currentKey = this.propertyKeys.get(keySymbol);
                const oldValue = target[currentKey];
                if (oldValue == newValue) return;
                newValue = this.listenFunction(newValue);

                target[currentKey] = newValue;
                this.broadcastMutation(target, new PropertyMutation(currentKey, oldValue, newValue));
            });
        }
    }

    protected removeSubpropertyWatcher(propertyKey: PropertyKey) {
        if (!this.propertySubscriptions[propertyKey]) return;
        this.propertySubscriptions[propertyKey].unsubscribe();
        delete this.propertySubscriptions[propertyKey];
    }

    protected clearSubpropertyWatchers() {
        Object.keys(this.propertySubscriptions).forEach((subpropertyKey) => {
            this.removeSubpropertyWatcher(subpropertyKey);
        });
    }

    /**
     * In arrays and related data structures the key (index) of a particular property can change over time.
     * For example, if you have an array of [item1, itemA] and you c all array.splice(1, 0, itemAlpha), the
     * key of itemA will change from 1 to 2. This function allows subproperty watchers to update their keys
     * without needing to resubscribe.
     * @param mapperFunction Returns the new key that an existing one should map to, or null if the specific
     *  subproperty was deleted (which will cause removeSubpropertyWatcher() to be called automatically).
     */
    protected remapPropertyKeys(mapperFunction: (currentKey: PropertyKey) => PropertyKey | null) {
        const newSubpropertyKeys = new Map<Symbol, PropertyKey>();
        this.propertyKeys.forEach((currentKey: PropertyKey, symbol: Symbol) => {
            const newKey = mapperFunction(currentKey);
            if (newKey === null) {
                this.removeSubpropertyWatcher(currentKey);
            } else {
                newSubpropertyKeys.set(symbol, newKey);
            }
        });
        this.propertyKeys = newSubpropertyKeys;
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
        if (target.constructor.prototype && target.constructor.prototype[key]) {
            throw new Error('Cannot observe a prototype function like ' + (key as string));
        }

        const initialValue = this.get(target as T, key);
        const initialCollectionValue = ((initialValue as any) as ListenableCollection);
        
        let streamObservable: Observable<U>;
        if (initialCollectionValue && initialCollectionValue[ListenableSignifier]) {
            streamObservable = (initialCollectionValue.asObservable() as any) as Observable<U>;
            
        } else {
            streamObservable = this.output.listen().pipe(
                filter((mutation) => mutation.key == key &&
                                     mutation instanceof PropertyMutation ||
                                     mutation instanceof SubpropertyMutation),
                map((mutation) => target[key])
            );
        }

        return concat(
            of(initialValue),
            streamObservable
        );
    }


    // OVERRIDABLE DATA FUNCTIONS

    protected abstract copyData(target: T);

    // Mutation Sequence used for optimizing mutations on this
    private batchingMutations: MutationSequence<T>;

    protected applyMutation(target: T, mutation: Mutation<any>, doNotBroadcast = false) {
        if (EpoxyGlobalState.strictBatchingMode && !EpoxyGlobalState.batchName) {
            throw new Error('Attempted to modify an object outside of a batch or transaction');
        }
        this.applyMutationInternal(target, mutation);
        if (!doNotBroadcast) {
            this.broadcastMutation(target, mutation);
        }
    }

    protected applyMutationInternal(target: T, mutation: Mutation<any>) {
        if (mutation instanceof SubpropertyMutation) {
            target[mutation.key].applyMutation(mutation.mutation);
        } else if (mutation instanceof ValueMutation) {
            target = mutation.newValue;
        } else if (mutation instanceof PropertyMutation) {
            target[mutation.key] = mutation.newValue;
        } else {
            throw new Error('Could not apply mutation: Unknown or invalid mutation type');
        }
    }

    protected broadcastMutation(target: T, mutation: Mutation<any>) {
        if (EpoxyGlobalState.batchingState === BatchingState.BATCHING_ACTIVE) {
            if (this.batchingMutations === undefined) {
                this.batchingMutations = MutationSequence.create(this.output);
                EpoxyGlobalState.registerBatchCallback((shouldRollback: boolean) => {
                    try {
                        this.batchingMutations.getOptimizedSequence().forEach((mutation) => {
                            if (shouldRollback) {
                                this.applyMutation(target, invertMutation(mutation), true);
                            } else {
                                this.broadcastMutation(target, mutation);
                            }
                        });
                    } finally {
                        this.batchingMutations = undefined;
                    }
                });
            }
            this.batchingMutations.pushMutation(mutation);
        } else {
            this.mutations.next(mutation);
        }
    }


    // PROXY FUNCTIONS

    get(target: T, property: PropertyKey) {
        // Implement IListenableArray functions.
        if (BaseProxyHandler.LISTENABLE_FUNCTION_IMPL.hasOwnProperty(property)) {
            let value = BaseProxyHandler.LISTENABLE_FUNCTION_IMPL[property];
            if (value instanceof Function) {
                value = value.bind(this, this, target);
            }
            return value;
        }
    }


    // ILISTENABLE FUNCTIONALITY

    private static LISTENABLE_FUNCTION_IMPL = {
        /**
         * Identifies listenable collections.
         */
        [ListenableSignifier]: true,

        /**
         * Returns a stream of all mutation events on this Array instance, including changes to any
         * of its subproperties.
         */
        listen<T extends object>(handler: BaseProxyHandler<T>) {
            return handler.mutations.asObservable();
        },
        
        /**
         * Returns an observable that updates whenever this data structure is mutated in any way.
         * Note that this involves making shallow copies and so should be used sparingly.
         */
        asObservable<T extends object>(handler: BaseProxyHandler<T>, target: T) {
            return this.outputAsObservable;
        },
        
        /**
         * Returns an Array that contains the same data as this array, except all of its properties
         * are observables rather than raw values. This is useful for plugging the structure into
         * consumers such as UI frameworks. 
         */
        observables<T extends object>(handler: BaseProxyHandler<T>) {
            return handler.observables();
        },

        /**
         * Returns a version of the listenable data structure that cannot be directly modified.
         */
        asReadonly<T extends object>(handler: BaseProxyHandler<T>, target: T) {
            if (target instanceof Array) {
                return new Proxy(handler.output as IListenableArray<any>, new ReadonlyArrayProxyHandler());
            } else {
                return new Proxy(handler.output, new ReadonlyProxyHandler());
            }
        },

        /**
         * Returns a non-listenable copy of this data structure.
         */
        staticCopy<T extends object>(handler: BaseProxyHandler<T>, target: T) {
            return handler.copyData(target);
        },

        /**
         * Sets a property on this data structure to a computed value or an Observable. This is
         * syntactic sugar that helps with type safety.
         */
        setComputed<T extends object>(
            handler: BaseProxyHandler<T>,
            target: T,
            key: PropertyKey,
            value: () => any | Observable<any>
        ) {
            if (value instanceof Function) {
                handler.watchObservableProperty(target, key, computed(value));
            } else {
                handler.watchObservableProperty(target, key, value);
            }
        },

        /**
         * Applies a given mutation to this collection.
         */
        applyMutation<T extends object>(handler: BaseProxyHandler<T>, target: T, mutation: Mutation<any>) {
            handler.applyMutation(target, mutation);
        },

        /**
         * Applies the opposite of a given mutation to this collection, undoing the change.
         */
        unapplyMutation<T extends object>(handler: BaseProxyHandler<T>, target: T, mutation: Mutation<any>) {
            handler.applyMutation(target, invertMutation(mutation));
        },

        /**
         * Gives this listenable a unique value that can be displayed in debug tools.
         */
        debugWithLabel<T extends object>(handler: BaseProxyHandler<T>, target: T, label: string) {
            const hadPreviousLabel = !!handler.debugLabel;
            handler.debugLabel = label;
            EpoxyGlobalState.logDebugMutation(handler.debugLabel, new ValueMutation(null, target));
            if (!hadPreviousLabel) {
                handler.mutations.subscribe((mutation) => {
                    EpoxyGlobalState.logDebugMutation(handler.debugLabel, mutation);
                });
            }
        },

        /**
         * Tells the listenable to immediately broadcast its current value to the asObservable() stream.
         */
        broadcastCurrentValue<T extends object>(handler: BaseProxyHandler<T>) {
            handler.valueSubject.next(handler.copyData(handler.output as T));
        }
    };
}