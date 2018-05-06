import {
    IListenableArray, IListenableObject, ListenableCollection, TypedObject, 
    ValueMutation, PropertyMutation, SubpropertyMutation, ArraySpliceMutation,
    makeListenable, optionallyComputed 
} from "../../epoxy";

import {filterArray} from './filter-array';

export type FilterFunction<T> = (T) => Boolean;

/**
 * Takes a listenable data structure and creates a new readonly listenable
 * data structure containing only those values that pass the predicate test
 * specified in the filter function.
 */
export function filter<T>(
    collection: IListenableArray<T>, filterFunction: FilterFunction<T>): IListenableArray<T>;
export function filter<T>(
    collection: IListenableObject<T>, filterFunction: FilterFunction<T>): IListenableObject<T>;
export function filter<T>(
    collection: ListenableCollection, filterFunction: FilterFunction<T>): ListenableCollection {
    if (collection instanceof Array) {
        return filterArray(collection, filterFunction);
    } else {
        throw new Error('Object filtering is not yet supported');
    }
}