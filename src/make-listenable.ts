import { ArrayProxyHandler } from './array-proxy';
import { Listenable, WatchType, IListenableTypeOutput, TypedObject, ListenableSignifier } from './types';
import { ObjectProxyHandler } from './object-proxy';
import { Observable } from 'rxjs';

 /**
  * Takes a data structure and returns a version of that data structure that can be watched.
  * Note that if the user passes in a primitive value it will be returned as-is.
  * By default this will not convert anything that has a custom constructor (that is, any object
  * that is an instance of a class other than Object). To override this behavior, set the
  * optional convertClassInstances argument to true.
  */
 export function makeListenable<T>(input: Observable<T>, convertClassInstances?): Observable<T>;
 export function makeListenable<T>(input: T, convertClassInstances?): Listenable<T>;
 export function makeListenable<T extends WatchType>(input: T, convertClassInstances = true): WatchType {

    // Pass through anything that definitely isn't a data structure, or that has
    // already been wrapped by makeListenable.
    if (input === null ||
        typeof input !== 'object' ||
        input[ListenableSignifier] === true ||
        input instanceof Observable
    ) {
        return input;
    }

    if (input instanceof Array) {
        return ArrayProxyHandler.createProxy(input);
    } else if (convertClassInstances ? input instanceof Object : input['constructor'] === Object) {
        return ObjectProxyHandler.createProxy(input as TypedObject<any>);
    } else {
        return input;
    }
}
