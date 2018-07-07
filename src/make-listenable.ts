import { ArrayProxyHandler } from './array-proxy';
import { IListenableArray, IListenableObject, WatchType, IGenericListenable, IListenableTypeOutput, TypedObject, IListenable, ListenableSignifier } from './types';
import { ObjectProxyHandler } from './object-proxy';
import { Observable } from 'rxjs';

 /**
  * Takes a data structure and returns a version of that data structure that can be watched.
  * Note that if the user passes in a primitive value it will be returned as-is.
  */
 export function makeListenable<T>(input: Array<T>): IListenableArray<T>;
 export function makeListenable<T extends {}>(input: T): IListenableTypeOutput<T>;
 export function makeListenable<T>(input: Observable<T>): Observable<T>;
 export function makeListenable<T>(input: T): T;
 export function makeListenable<T extends WatchType>(input: T): WatchType {
    if (input instanceof Observable) {
        return input;
    }
    if (input[ListenableSignifier] === true) {
        return input;
    }
    if (input instanceof Array) {
        return ArrayProxyHandler.createProxy(input);
    } else if (input instanceof Object) {
        return ObjectProxyHandler.createProxy(input as TypedObject<any>);
    } else {
        return input;
    }
}
