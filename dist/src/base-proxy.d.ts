import { Mutation } from './mutations';
import { WatchType, ListenableCollection, TypedObject } from './types';
import { Observable, Subject, Subscription } from 'rxjs';
/**
 * Base class for all data structure proxy handlers.
 */
export declare abstract class BaseProxyHandler<T extends object> implements ProxyHandler<T> {
    protected listenFunction: (input: WatchType) => any;
    constructor(listenFunction: (input: WatchType) => any);
    protected output: ListenableCollection;
    setOutput(output: ListenableCollection): void;
    debugLabel: string;
    protected changeSubject: Subject<T>;
    protected mutations: Subject<Mutation<T>>;
    protected propertySubscriptions: TypedObject<Subscription>;
    private propertyKeys;
    protected watchSubpropertyChanges(target: T, key: PropertyKey, value: WatchType | Observable<any>): void;
    protected watchObservableProperty(target: T, key: PropertyKey, value: Observable<any>): void;
    protected removeSubpropertyWatcher(propertyKey: PropertyKey): void;
    protected clearSubpropertyWatchers(): void;
    /**
     * In arrays and related data structures the key (index) of a particular property can change over time.
     * For example, if you have an array of [item1, itemA] and you call array.splice(1, 0, itemAlpha), the
     * key of itemA will change from 1 to 2. This function allows subproperty watchers to update their keys
     * without needing to resubscribe.
     * @param mapperFunction Returns the new key that an existing one should map to, or null if the specific
     *  subproperty was deleted (which will cause removeSubpropertyWatcher() to be called automatically).
     */
    protected remapPropertyKeys(mapperFunction: (currentKey: PropertyKey) => PropertyKey | null): void;
    observables<U extends ListenableCollection>(): U;
    getObservable<U>(target: object, key: PropertyKey): Observable<U>;
    protected abstract copyData(target: T): any;
    protected applyMutation(target: T, mutation: Mutation<any>): void;
    get(target: T, property: PropertyKey): any;
    private static LISTENABLE_FUNCTION_IMPL;
}
