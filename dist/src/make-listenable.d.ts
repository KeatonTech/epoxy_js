import { IListenableArray, IListenableTypeOutput } from './types';
import { Observable } from 'rxjs';
/**
 * Takes a data structure and returns a version of that data structure that can be watched.
 * Note that if the user passes in a primitive value it will be returned as-is.
 */
export declare function makeListenable<T>(input: Array<T>): IListenableArray<T>;
export declare function makeListenable<T extends {}>(input: T): IListenableTypeOutput<T>;
export declare function makeListenable<T>(input: Observable<T>): Observable<T>;
export declare function makeListenable<T>(input: T): T;
