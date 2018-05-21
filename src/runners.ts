import { Observable, Subject, concat, of, Subscription, ConnectableObservable, observable } from 'rxjs';
import { map, filter, multicast } from 'rxjs/operators';

import { EpoxyGlobalState } from './global-state';
import { PropertyMutation, ArraySpliceMutation } from './mutations';
import { ListenableCollection } from './types';

/**
 * Internal function that creates and updates a new computed observable.
 */
function definitelyComputedInternal<T>(
    computeFunction: () => T,
    subscriptions: Subscription[],
): Observable<T> {
    let initialValue: T;
    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        initialValue = computeFunction();
    });

    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();
    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);

    const updateStream = changeSubject.pipe(
        map(() => {
            let result: T;
            const updatedListenerMap = EpoxyGlobalState.trackGetters(() => {
                result = computeFunction();
            });
            updateListenerMap(listenerMap, updatedListenerMap, changeSubject, subscriptions);
            return result;
        }
    ));

    return concat(of(initialValue), updateStream);
}

/**
 * Outputs an observable iff the computeFunction depends on Epoxy values. If the compute
 * function has no dependencies this function simply returns the output value.
 */
export function optionallyComputed<T>(computeFunction: () => T): Observable<T> | T {
    let initialValue: T;
    const subscriptions = [];

    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        initialValue = computeFunction();
    });
    if (initialListenerMap.size === 0) {
        return initialValue;
    }
    
    return computed(computeFunction);
}

/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
export function computed<T>(computeFunction: () => T): Observable<T> {
    return Observable.create((subscriber) => {
        const subscriptions: Subscription[] = [];
        const innerObservable = definitelyComputedInternal(computeFunction, subscriptions);
        const innerSubscriber = innerObservable.subscribe(subscriber);
        
        // Function to be run when the subscription to this observable is lost.
        return () => {
            innerSubscriber.unsubscribe();
            subscriptions.forEach((sub) => sub.unsubscribe());
        }
    });
}

/**
 * Internal function that updates a listener map with new items by registering new listeners.
 */
function updateListenerMap(
    currentMap: Map<ListenableCollection, Set<PropertyKey>>,
    additionalMap: Map<ListenableCollection, Set<PropertyKey>>,
    listener: Subject<undefined>,
    subscriptions: Array<Subscription>
) {
    additionalMap.forEach((value, key) => {
        if (currentMap.has(key)) {
            value.forEach((property) => currentMap.get(key).add(property));
        } else {
            currentMap.set(key, value);
            subscriptions.push(key.listen().subscribe((mutation) => {
                if (mutation instanceof ArraySpliceMutation ||
                    currentMap.get(key).has(mutation.key)) {
                        listener.next();
                    }
            }));
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
    return concat(of(initialResult), collection.observables()[key]);
}

/**
 * Re-runs the function whenever any Epoxy value it depends on changes.
 * Returns a function that, if called, will 
 */
export function autorun(autorunFunction: () => any): ()=>void {
    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();
    const subscriptions = [];

    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        autorunFunction();
    });

    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);
    const changeSubjectSubscription = changeSubject.subscribe(() => {
            const updatedListenerMap = EpoxyGlobalState.trackGetters(() => {
                autorunFunction();
            });
            updateListenerMap(listenerMap, updatedListenerMap, changeSubject, subscriptions);
    });

    // Return an unsubscribe function
    return () => {
        changeSubjectSubscription.unsubscribe();
        subscriptions.forEach((sub) => sub.unsubscribe());
    };
}