import * as Mutations from './mutations';
import {Observable, Subject} from 'rxjs';

type Constructor<T = {}> = new (...args: any[]) => T;

export type TypedObject<T> = {[key: string] : T, [key: number] : T};

/**
 * Extended interface for proxied arrays granting access to the change stream.
 */
export interface IListenable<STRUCTURE_TYPE, OBSERVABLES_TYPE, LISTENABLE_TYPE> {
    /**
     * Returns a stream of all mutation events on this Array instance, including changes to any
     * of its subproperties.
     */
    listen(): Observable<Mutations.Mutation<STRUCTURE_TYPE>>;

    /**
     * Returns an observable that updates whenever this data structure is mutated in any way.
     * Note that this involves making shallow copies and so should be used sparingly.
     */
    asObservable(): Observable<STRUCTURE_TYPE>;

    /**
     * Returns an Array that contains the same data as this array, except all of its properties
     * are observables rather than raw values. This is useful for plugging the structure into
     * consumers such as UI frameworks. 
     */
    observables(): OBSERVABLES_TYPE;

    /**
     * Returns a version of the listenable data structure that cannot be directly modified.
     */
    asReadonly(): LISTENABLE_TYPE;

    /**
     * Sets a property on this data structure to a computed value or an Observable. This is
     * syntactic sugar that helps with type safety.
     */
    setComputed(key: PropertyKey, computed: () => any | Observable<any>): void;

    /**
     * Applies a given mutation to this collection.
     */
    applyMutation(mutation: Mutations.Mutation<any>): void;

    /**
     * Applies the opposite of a given mutation to this collection, undoing the change.
     */
    unapplyMutation(mutation: Mutations.Mutation<any>): void;

    /**
     * Gives this listenable a unique value that can be displayed in debug tools.
     */
    debugWithLabel(label: string): void;

    /**
     * Tells the listenable to immediately broadcast its current value to the asObservable() stream.
     */
    broadcastCurrentValue(): void;
}

/**
 * Interface to check if something is listenable.
 */
export interface IGenericListenable extends IListenable<any, any, any> {}

/**
 * Adds listenable properties to an input type.
 */
export type IListenableTypeOutput<T extends Object> = T & IGenericListenable;

/**
 * Extended interface for proxied arrays granting access to the change stream.
 */
export interface IListenableArray<T> extends Array<T>, IListenable<
    T[],                        // Structure Type
    Array<Observable<T>>,       // Observables Structure Type
    IListenableArray<T>         // Listenable Type
> {}

/**
 * Extended interface for proxied objects granting access to the change stream.
 */
export interface IListenableObject<T> extends Object, IListenable<
    TypedObject<T>,             // Structure Type
    TypedObject<Observable<T>>, // Observables Structure Type
    IListenableObject<T>> {}    // Listenable Type

/**
 * Any listenable collection.
 */
export type ListenableCollection = IListenableArray<any> | IListenableObject<any>;

/**
 * Type representing acceptable inputs into the watch() function.
 */
export type WatchType = IListenableArray<any> | IListenableObject<any> | Observable<any> |
                        string | number | boolean | symbol;