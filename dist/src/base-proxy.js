"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mutations_1 = require("./mutations");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const global_state_1 = require("./global-state");
const runners_1 = require("./runners");
/**
 * Base class for all data structure proxy handlers.
 */
class BaseProxyHandler {
    constructor(listenFunction) {
        this.listenFunction = listenFunction;
        this.debugLabel = '';
        this.changeSubject = new rxjs_1.Subject();
        this.mutations = new rxjs_1.Subject();
        // Stream subscriptions to IListenable instances or Observalbes contained in this structure.
        this.propertySubscriptions = {};
        // Allows subscription functions to be mapped to their current property key.
        this.propertyKeys = new Map();
    }
    setOutput(output) {
        this.output = output;
        this.mutations.subscribe((mutation) => {
            if (global_state_1.EpoxyGlobalState.isBatching) {
                global_state_1.EpoxyGlobalState.markChangedDuringBatch(this.output);
                return;
            }
            this.changeSubject.next(this.copyData(this.output));
        });
    }
    // WATCH SUBPROPERTY CHANGES
    watchSubpropertyChanges(key, value) {
        const keySymbol = Symbol();
        this.propertyKeys.set(keySymbol, key);
        if (this.propertySubscriptions[key] !== undefined) {
            this.propertySubscriptions[key].unsubscribe();
            delete this.propertySubscriptions[key];
        }
        if ((value instanceof Array) || (value instanceof Object)) {
            this.propertySubscriptions[key] = value
                .listen()
                .subscribe((mutation) => {
                const currentKey = this.propertyKeys.get(keySymbol);
                this.mutations.next(new mutations_1.SubpropertyMutation(currentKey, mutation));
            });
        }
    }
    watchObservableProperty(target, key, value) {
        const keySymbol = Symbol();
        this.propertyKeys.set(keySymbol, key);
        if (this.propertySubscriptions[key] !== undefined) {
            this.propertySubscriptions[key].unsubscribe();
            delete this.propertySubscriptions[key];
        }
        if ((value instanceof Array) || (value instanceof Object)) {
            this.propertySubscriptions[key] = value.subscribe((newValue) => {
                const currentKey = this.propertyKeys.get(keySymbol);
                const oldValue = target[currentKey];
                if (oldValue == newValue)
                    return;
                newValue = this.listenFunction(newValue);
                target[currentKey] = newValue;
                this.mutations.next(new mutations_1.PropertyMutation(currentKey, oldValue, newValue));
            });
        }
    }
    removeSubpropertyWatcher(propertyKey) {
        if (!this.propertySubscriptions[propertyKey])
            return;
        this.propertySubscriptions[propertyKey].unsubscribe();
        delete this.propertySubscriptions[propertyKey];
    }
    clearSubpropertyWatchers() {
        Object.keys(this.propertySubscriptions).forEach((subpropertyKey) => {
            this.removeSubpropertyWatcher(subpropertyKey);
        });
    }
    /**
     * In arrays and related data structures the key (index) of a particular property can change over time.
     * For example, if you have an array of [item1, itemA] and you call array.splice(1, 0, itemAlpha), the
     * key of itemA will change from 1 to 2. This function allows subproperty watchers to update their keys
     * without needing to resubscribe.
     * @param mapperFunction Returns the new key that an existing one should map to, or null if the specific
     *  subproperty was deleted (which will cause removeSubpropertyWatcher() to be called automatically).
     */
    remapPropertyKeys(mapperFunction) {
        const newSubpropertyKeys = new Map();
        this.propertyKeys.forEach((currentKey, symbol) => {
            const newKey = mapperFunction(currentKey);
            if (newKey === null) {
                this.removeSubpropertyWatcher(currentKey);
            }
            else {
                newSubpropertyKeys.set(symbol, newKey);
            }
        });
        this.propertyKeys = newSubpropertyKeys;
    }
    // OBSERVING PROPERTIES
    observables() {
        return new Proxy(this.output, {
            get: (target, key) => {
                return this.getObservable(target, key);
            },
            set: (target, key, value) => {
                throw new Error('Cannot set properties on a collection\'s observables');
            }
        });
    }
    getObservable(target, key) {
        const initialValue = target[key];
        const initialCollectionValue = initialValue;
        let streamObservable;
        if (initialCollectionValue && initialCollectionValue.asObservable) {
            streamObservable = initialCollectionValue.asObservable();
        }
        else {
            streamObservable = this.output.listen().pipe(operators_1.filter((mutation) => mutation.key == key &&
                mutation instanceof mutations_1.PropertyMutation ||
                mutation instanceof mutations_1.SubpropertyMutation), operators_1.map((mutation) => target[key]));
        }
        return rxjs_1.Observable.concat(rxjs_1.Observable.of(initialValue), streamObservable);
    }
    applyMutation(target, mutation) {
        if (mutation instanceof mutations_1.SubpropertyMutation) {
            target[mutation.key].applyMutation(mutation.mutation);
        }
        else if (mutation instanceof mutations_1.PropertyMutation) {
            target[mutation.key] = mutation.newValue;
        }
        else {
            throw new Error('Could not apply mutation: Unknown or invalid mutation type');
        }
    }
    // PROXY FUNCTIONS
    get(target, property) {
        // Implement IListenableArray functions.
        if (BaseProxyHandler.LISTENABLE_FUNCTION_IMPL.hasOwnProperty(property)) {
            let value = BaseProxyHandler.LISTENABLE_FUNCTION_IMPL[property];
            if (value instanceof Function) {
                value = value.bind(this, this, target);
            }
            return value;
        }
        global_state_1.EpoxyGlobalState.registerGetterCall(this.output, property);
    }
}
// ILISTENABLE FUNCTIONALITY
BaseProxyHandler.LISTENABLE_FUNCTION_IMPL = {
    /**
     * Returns a stream of all mutation events on this Array instance, including changes to any
     * of its subproperties.
     */
    listen(handler) {
        return handler.mutations.asObservable();
    },
    /**
     * Returns an observable that updates whenever this data structure is mutated in any way.
     * Note that this involves making shallow copies and so should be used sparingly.
     */
    asObservable(handler, target) {
        return this.changeSubject.asObservable();
    },
    /**
     * Returns an Array that contains the same data as this array, except all of its properties
     * are observables rather than raw values. This is useful for plugging the structure into
     * consumers such as UI frameworks.
     */
    observables(handler) {
        return handler.observables();
    },
    /**
     * Sets a property on this data structure to a computed value or an Observable. This is
     * syntactic sugar that helps with type safety.
     */
    setComputed(handler, target, key, value) {
        if (value instanceof Function) {
            handler.watchObservableProperty(target, key, runners_1.computed(value));
        }
        else {
            handler.watchObservableProperty(target, key, value);
        }
    },
    /**
     * Applies a given mutation to this collection.
     */
    applyMutation(handler, target, mutation) {
        handler.applyMutation(target, mutation);
    },
    /**
     * Applies the opposite of a given mutation to this collection, undoing the change.
     */
    unapplyMutation(handler, target, mutation) {
        handler.applyMutation(target, mutations_1.invertMutation(mutation));
    },
    /**
     * Gives this listenable a unique value that can be displayed in debug tools.
     */
    debugWithLabel(handler, label) {
        const hadPreviousLabel = !!handler.debugLabel;
        handler.debugLabel = label;
        if (!hadPreviousLabel) {
            handler.mutations.subscribe((mutation) => {
                global_state_1.EpoxyGlobalState.logDebugMutation(handler.debugLabel, mutation);
            });
        }
    },
    /**
     * Tells the listenable to immediately broadcast its current value to the asObservable() stream.
     */
    broadcastCurrentValue(handler) {
        handler.changeSubject.next(handler.copyData(handler.output));
    }
};
exports.BaseProxyHandler = BaseProxyHandler;
