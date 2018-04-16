import { IListenableArray, IListenableObject, IListenable } from './types';
/**
 * Takes a data structure and returns a version of that data structure that can be watched.
 * Note that if the user passes in a primitive value it will be returned as-is.
 */
export declare function makeListenable<T>(input: Array<T>): IListenableArray<T>;
export declare function makeListenable<T>(input: {
    [key: string]: T;
}): IListenableObject<T>;
export declare function makeListenable<T>(input: IListenable<T>): IListenable<T>;
export declare function makeListenable<T>(input: T): T;
