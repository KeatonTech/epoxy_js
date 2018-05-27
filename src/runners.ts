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
    subscriptions: Map<ListenableCollection, Subscription>,
): Observable<T> {
    let initialValue: T;
    const initialListenerMap = EpoxyGlobalState.trackGetters(() => {
        initialValue = computeFunction();
    }).getters;

    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();
    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);

    const updateStream = changeSubject.pipe(
        map(() => {
            let result: T;
            const updatedRun = EpoxyGlobalState.trackGetters(() => {
                result = computeFunction();
            });
            updateListenerMap(listenerMap, updatedRun.getters, changeSubject, subscriptions);
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
    }).getters;
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
        const subscriptions: Map<ListenableCollection, Subscription> = new Map();
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
    newMap: Map<ListenableCollection, Set<PropertyKey>>,
    listener: Subject<undefined>,
    subscriptions: Map<ListenableCollection, Subscription>
) {
    // Cancel subscriptions that are no longer necessary.
    currentMap.forEach((value, key) => {
        if (!newMap.has(key)) subscriptions.get(key).unsubscribe();
    });

    // Make new subscriptions.
    newMap.forEach((value, key) => {
        const hasExistingKey = currentMap.has(key);
        currentMap.set(key, value);
        if (!hasExistingKey) {
            subscriptions.set(key, (key.listen().subscribe((mutation) => {
                if (mutation instanceof ArraySpliceMutation ||
                    currentMap.get(key).has(mutation.key)) {
                        listener.next();
                    }
                })));
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
    }).getters;
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
 * Re-runs the function whenever any Epoxy value it depends on changes. Returns a function that, if
 * called, will stop the listeners and stop the function from running. An optional trackerFunction
 * argument allows users to wrap the standard trackGetters function.
 */
export function autorun(
    autorunFunction: () => any,
    trackerFunction = EpoxyGlobalState.trackGetters
): ()=>void {
    const changeSubject = new Subject<undefined>();
    const listenerMap = new Map<ListenableCollection, Set<PropertyKey>>();
    const subscriptions: Map<ListenableCollection, Subscription> = new Map();

    const initialRun = trackerFunction(() => {
        autorunFunction();
    });
    const initialListenerMap = initialRun.getters;
    let lastRunUnsubscribeFunction = initialRun.nestedUnsubscribeFunctions;

    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);
    const changeSubjectSubscription = changeSubject.subscribe(() => {
        lastRunUnsubscribeFunction.forEach((fn) => fn());
        const lastRun = trackerFunction(() => {
            autorunFunction();
        });
        lastRunUnsubscribeFunction = lastRun.nestedUnsubscribeFunctions;
        updateListenerMap(listenerMap, lastRun.getters, changeSubject, subscriptions);
    });

    // Return an unsubscribe function
    let cancelled = false;
    return () => {
        if (cancelled) return;
        cancelled = true;
        changeSubjectSubscription.unsubscribe();
        subscriptions.forEach((sub) => sub.unsubscribe());
        lastRunUnsubscribeFunction.forEach((fn) => fn());
    };
}

/**
 * Similar to autorun() but allows more autorunTree() functions to be used from inside the
 * autorun function (unlike autorun() which strictly disallows nested autoruns()). The
 * dependencies of the child autorunTree() calls will not be included in the dependencies of
 * the parent.
 */
export function autorunTree(autorunFunction: () => any): ()=>void {
    const unsubscribe = autorun(autorunFunction, EpoxyGlobalState.trackGettersNestable);
    EpoxyGlobalState.registerNestedUnsubscribe(unsubscribe);
    return unsubscribe;
}