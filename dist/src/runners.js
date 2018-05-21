"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const global_state_1 = require("./global-state");
const mutations_1 = require("./mutations");
/**
 * Internal function that creates and updates a new computed observable.
 */
function definitelyComputedInternal(computeFunction, subscriptions) {
    let initialValue;
    const initialListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
        initialValue = computeFunction();
    });
    const changeSubject = new rxjs_1.Subject();
    const listenerMap = new Map();
    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);
    const updateStream = changeSubject.pipe(operators_1.map(() => {
        let result;
        const updatedListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
            result = computeFunction();
        });
        updateListenerMap(listenerMap, updatedListenerMap, changeSubject, subscriptions);
        return result;
    }));
    return rxjs_1.concat(rxjs_1.of(initialValue), updateStream);
}
/**
 * Outputs an observable iff the computeFunction depends on Epoxy values. If the compute
 * function has no dependencies this function simply returns the output value.
 */
function optionallyComputed(computeFunction) {
    let initialValue;
    const subscriptions = [];
    const initialListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
        initialValue = computeFunction();
    });
    if (initialListenerMap.size === 0) {
        return initialValue;
    }
    return computed(computeFunction);
}
exports.optionallyComputed = optionallyComputed;
/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
function computed(computeFunction) {
    return rxjs_1.Observable.create((subscriber) => {
        const subscriptions = [];
        const innerObservable = definitelyComputedInternal(computeFunction, subscriptions);
        const innerSubscriber = innerObservable.subscribe(subscriber);
        // Function to be run when the subscription to this observable is lost.
        return () => {
            innerSubscriber.unsubscribe();
            subscriptions.forEach((sub) => sub.unsubscribe());
        };
    });
}
exports.computed = computed;
/**
 * Internal function that updates a listener map with new items by registering new listeners.
 */
function updateListenerMap(currentMap, additionalMap, listener, subscriptions) {
    additionalMap.forEach((value, key) => {
        if (currentMap.has(key)) {
            value.forEach((property) => currentMap.get(key).add(property));
        }
        else {
            currentMap.set(key, value);
            subscriptions.push(key.listen().subscribe((mutation) => {
                if (mutation instanceof mutations_1.ArraySpliceMutation ||
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
function observe(pickerFunction) {
    let initialResult;
    const changeSubject = new rxjs_1.Subject();
    const listenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
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
    return rxjs_1.concat(rxjs_1.of(initialResult), collection.observables()[key]);
}
exports.observe = observe;
/**
 * Re-runs the function whenever any Epoxy value it depends on changes.
 * Returns a function that, if called, will
 */
function autorun(autorunFunction) {
    const changeSubject = new rxjs_1.Subject();
    const listenerMap = new Map();
    const subscriptions = [];
    const initialListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
        autorunFunction();
    });
    updateListenerMap(listenerMap, initialListenerMap, changeSubject, subscriptions);
    const changeSubjectSubscription = changeSubject.subscribe(() => {
        const updatedListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
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
exports.autorun = autorun;
