"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mutations = require("./mutations");
const make_listenable_1 = require("./make-listenable");
const base_proxy_1 = require("./base-proxy");
const rxjs_1 = require("rxjs");
/**
 * Proxy handler for Array objects.
 */
class ObjectProxyHandler extends base_proxy_1.BaseProxyHandler {
    constructor(listenFunction, initialValues) {
        super(listenFunction);
        this.initialValues = initialValues;
        Object.keys(initialValues).forEach((key) => {
            this.watchSubpropertyChanges(key, initialValues[key]);
        });
    }
    static createProxy(initialValue = {}) {
        const watchedInput = {};
        for (let key in initialValue) {
            watchedInput[key] = make_listenable_1.makeListenable(initialValue[key]);
        }
        const handler = new ObjectProxyHandler(make_listenable_1.makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler);
        handler.setOutput(output);
        return output;
    }
    copyData(target) {
        return { ...target };
    }
    // PROXY FUNCTIONS
    get(target, property) {
        return super.get(target, property) || target[property];
    }
    set(target, property, value) {
        if (value instanceof rxjs_1.Observable) {
            this.watchObservableProperty(target, property, value);
            return true;
        }
        const oldValue = target[property];
        const newValue = this.listenFunction(value);
        target[property] = newValue;
        this.removeSubpropertyWatcher(property);
        this.watchSubpropertyChanges(property, newValue);
        this.mutations.next(new Mutations.PropertyMutation(property, oldValue, newValue));
        return true;
    }
    deleteProperty(target, property) {
        this.removeSubpropertyWatcher(property);
        return delete target[property];
    }
}
exports.ObjectProxyHandler = ObjectProxyHandler;
