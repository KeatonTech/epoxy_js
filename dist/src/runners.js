"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const global_state_1 = require("./global-state");
const mutations_1 = require("./mutations");
/**
 * Outputs an observable iff the computeFunction depends on Epoxy values. If the compute
 * function has no dependencies this function simply returns the output value.
 */
function optionallyComputed(computeFunction) {
    let initialResult;
    const changeSubject = new rxjs_1.Subject();
    const listenerMap = new Map();
    const initialListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
        initialResult = computeFunction();
    });
    if (initialListenerMap.size === 0) {
        return initialResult;
    }
    updateListenerMap(listenerMap, initialListenerMap, changeSubject);
    const updateStream = changeSubject.pipe(operators_1.map(() => {
        let result;
        const updatedListenerMap = global_state_1.EpoxyGlobalState.trackGetters(() => {
            result = computeFunction();
        });
        updateListenerMap(listenerMap, updatedListenerMap, changeSubject);
        return result;
    }));
    return rxjs_1.Observable.concat(rxjs_1.Observable.of(initialResult), updateStream);
}
exports.optionallyComputed = optionallyComputed;
/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
function computed(computeFunction) {
    const output = optionallyComputed(computeFunction);
    if (output instanceof rxjs_1.Observable) {
        return output;
    }
    else {
        return rxjs_1.Observable.of(output);
    }
}
exports.computed = computed;
/**
 * Internal function that updates a listener map with new items by registering new listeners.
 */
function updateListenerMap(currentMap, additionalMap, listener) {
    additionalMap.forEach((value, key) => {
        if (currentMap.has(key)) {
            value.forEach((property) => currentMap.get(key).add(property));
        }
        else {
            currentMap.set(key, value);
            key.listen().subscribe((mutation) => {
                if (mutation instanceof mutations_1.ArraySpliceMutation ||
                    currentMap.get(key).has(mutation.key)) {
                    listener.next();
                }
            });
        }
    });
}
