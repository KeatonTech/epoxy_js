import { IListenableArray, IListenableObject } from "../../epoxy";
export declare type FilterFunction<T> = (T) => Boolean;
/**
 * Takes a listenable data structure and creates a new readonly listenable
 * data structure containing only those values that pass the predicate test
 * specified in the filter function.
 */
export declare function filter<T>(collection: IListenableArray<T>, filterFunction: FilterFunction<T>): IListenableArray<T>;
export declare function filter<T>(collection: IListenableObject<T>, filterFunction: FilterFunction<T>): IListenableObject<T>;
