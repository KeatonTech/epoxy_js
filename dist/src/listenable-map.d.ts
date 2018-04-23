import { IListenableArray, IListenableObject } from "./types";
export declare type MapFunction<T, U> = (T, PropertyKey) => U;
/**
 * Takes a listenable data structure and creates a new readonly listenable
 * data structure whose values are derived from the values in the original
 * structure using a mapping function. This mapping function can depend on
 * values from other Epoxy listenable data structures.
 */
export declare function listenableMap<T, U>(collection: IListenableArray<T>, mapFunction: MapFunction<T, U>): IListenableArray<U>;
export declare function listenableMap<T, U>(collection: IListenableObject<T>, mapFunction: MapFunction<T, U>): IListenableObject<U>;
