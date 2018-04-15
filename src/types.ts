import * as Mutations from './mutations';
import {Observable, Subject} from 'rxjs';

type Constructor<T = {}> = new (...args: any[]) => T;


/**
 * Extended interface for proxied arrays granting access to the change stream.
 */
export interface IListenable<T> {
    /**
     * Returns a stream of all mutation events on this Array instance, including changes to any
     * of its subproperties.
     */
    listen(): Observable<Mutations.Mutation<T>>;

    /**
     * Returns an observable that updates whenever this data structure is mutated in any way.
     * Note that this involves making shallow copies and so should be used sparingly.
     */
    asObservable(): Observable<Array<T>>;

    /**
     * Returns an Array that contains the same data as this array, except all of its properties
     * are observables rather than raw values. This is useful for plugging the structure into
     * consumers such as UI frameworks. 
     */
    observables(): Array<Observable<T>>;

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
}


/**
 * Extended interface for proxied arrays granting access to the change stream.
 */
export interface IListenableArray<T> extends IListenable<T>, Array<T> {}

/**
 * Extended interface for proxied objects granting access to the change stream.
 */
export interface IListenableObject<T> extends IListenable<T>, Object {}

/**
 * Any listenable collection.
 */
export type ListenableCollection = IListenableArray<any> | IListenableObject<any>;

/**
 * Type representing acceptable inputs into the watch() function.
 */
export type WatchType = IListenableArray<any> | IListenableObject<any> | string | number | boolean | symbol;