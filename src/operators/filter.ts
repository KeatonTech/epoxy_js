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
    } else if (collection) {
        
        // Object filtering
        const filteredListenable = makeListenable(
            filterObject((collection as any) as TypedObject<T>, filterFunction));
        
        collection.listen().subscribe((mutation) => {
            if (filterFunction(collection[mutation.key])) {
                filteredListenable.applyMutation(mutation);
            } else {
                delete filteredListenable[mutation.key as string | number];
            }
        });

        return filteredListenable.asReadonly();
    }
}

/**
 * Filter an objects keys to only those whose values pass a test.
 */
function filterObject<T>(input: TypedObject<T>, filterFunction: FilterFunction<T>): TypedObject<T> {
    const ret: TypedObject<T> = {};
    for (const key in input) {
        if (filterFunction(input[key])) {
            ret[key] = input[key];
        }
    }
    return ret;
}