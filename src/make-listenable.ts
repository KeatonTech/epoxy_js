import { ArrayProxyHandler } from './array-proxy';
import { Listenable, WatchType, TypedObject, ListenableSignifier } from './types';
import { ObjectProxyHandler } from './object-proxy';
import { Observable } from 'rxjs';

/**
 * Exclude instances of these classes from being made listenable. This is particularly helpful
 * for things like HTMLElement that have circular references and just generally don't make sense
 * to directly watch.
 */
const EXCLUDE_TYPES: Array<new ()=>{}> = [Element];

/**
 * Declare that a given type should not be made listenable.
 */
export function excludeTypeFromMakeListenable(type: new () => {}) {
    EXCLUDE_TYPES.push(type);
}

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

    // Exclude certain types.
    for (const type of EXCLUDE_TYPES) {
        if (input instanceof type) {
            return input;
        }
    }

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
