import { IListenableArray } from "../../epoxy";
export declare type FilterFunction<T> = (T) => Boolean;
/**
 * Takes a listenable array and creates a new readonly listenable array containing
 * only those values that pass the predicate test specified in the filter function.
 */
export declare function filterArray<T>(collection: IListenableArray<T>, filterFunction: FilterFunction<T>): IListenableArray<T>;
