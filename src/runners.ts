import { Observable, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';

import { EpoxyGlobalState } from './global-state';
import { PropertyMutation, ArraySpliceMutation } from './mutations';
import { ListenableCollection } from './types';


/**
 * Outputs an observable iff the computeFunction depends on Epoxy values. If the compute
 * function has no dependencies this function simply returns the output value.
 */
export function optionallyComputed<T>(computeFunction: () => T): Observable<T> | T {
    let initialResult: T;
    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();

    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        initialResult = computeFunction();
    });
    if (initialListenerMap.size === 0) {
        return initialResult;
    }

    updateListenerMap(listenerMap, initialListenerMap, changeSubject);

    const updateStream = changeSubject.pipe(
        map(() => {
            let result: T;
            const updatedListenerMap = EpoxyGlobalState.trackGetters(() => {
                result = computeFunction();
            });
            updateListenerMap(listenerMap, updatedListenerMap, changeSubject);
            return result;
        }
    ));

    return Observable.concat(Observable.of(initialResult), updateStream);
}

/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
export function computed<T>(computeFunction: () => T): Observable<T> {
    const output = optionallyComputed(computeFunction);
    if (output instanceof Observable) {
        return output;
    } else {
        return Observable.of(output);
    }
}

/**
 * Internal function that updates a listener map with new items by registering new listeners.
 */
function updateListenerMap(
    currentMap: Map<ListenableCollection, Set<PropertyKey>>,
    additionalMap: Map<ListenableCollection, Set<PropertyKey>>,
    listener: Subject<undefined>,
) {
    additionalMap.forEach((value, key) => {
        if (currentMap.has(key)) {
            value.forEach((property) => currentMap.get(key).add(property));
        } else {
            currentMap.set(key, value);
            key.listen().subscribe((mutation) => {
                if (mutation instanceof ArraySpliceMutation ||
                    currentMap.get(key).has(mutation.key)) {
                        listener.next();
                    }
            })
        }
    });
}

/**
 * Returns an observable that updates whenever an Epoxy value changes.
 */
export function observe<T>(pickerFunction: () => T): Observable<T> {
    let initialResult: T;
    const changeSubject = new Subject<undefined>();

    const listenerMap = EpoxyGlobalState.trackGetters(() => {
        initialResult = pickerFunction();
    });
    if (listenerMap.size === 0) {
        throw new Error('Observe function did not include an epoxy value.');
    }
    
    const collection = listenerMap.keys().next().value;
    const keys = listenerMap.get(collection);
    if (listenerMap.size > 1 || keys.size > 1) {
        throw new Error('Observe function included multiple epoxy values.');
    }

    const key = keys.values().next().value;
    return Observable.concat(Observable.of(initialResult), collection.observables()[key]);
}

/**
 * Re-runs the function whenever any Epoxy value it depends on changes.
 */
export function autorun(autorunFunction: () => any) {
    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();

    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        autorunFunction();
    });

    updateListenerMap(listenerMap, initialListenerMap, changeSubject);
    const updateStream = changeSubject.subscribe(() => {
            const updatedListenerMap = EpoxyGlobalState.trackGetters(() => {
                autorunFunction();
            });
            updateListenerMap(listenerMap, updatedListenerMap, changeSubject);
    });
}