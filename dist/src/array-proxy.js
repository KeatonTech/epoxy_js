"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mutations = require("./mutations");
const make_listenable_1 = require("./make-listenable");
const base_proxy_1 = require("./base-proxy");
const rxjs_1 = require("rxjs");
/**
 * Proxy handler for Array objects.
 */
class ArrayProxyHandler extends base_proxy_1.BaseProxyHandler {
    constructor(listenFunction, initialValues) {
        super(listenFunction);
        this.initialValues = initialValues;
        initialValues.forEach((value, index) => this.watchSubpropertyChanges(index, value));
    }
    static createProxy(initialValue = []) {
        const watchedInput = initialValue.map(make_listenable_1.makeListenable);
        const handler = new ArrayProxyHandler(make_listenable_1.makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler);
        handler.setOutput(output);
        return output;
    }
    copyData(target) {
        return target.slice();
    }
    applyMutation(target, mutation) {
        if (mutation instanceof Mutations.ArraySpliceMutation) {
            const spliceArgs = [mutation.key, mutation.deleted.length];
            spliceArgs.push.apply(spliceArgs, mutation.inserted);
            target.splice.apply(target, spliceArgs);
        }
        else {
            super.applyMutation(target, mutation);
        }
    }
    // PROXY FUNCTIONS
    get(target, property) {
        // Override array functions
        if (ArrayProxyHandler.ARRAY_FUNCTION_OVERRIDES.hasOwnProperty(property)) {
            let value = ArrayProxyHandler.ARRAY_FUNCTION_OVERRIDES[property];
            if (value instanceof Function) {
                value = value.bind(this, this, target);
            }
            return value;
        }
        // Attempt to convert string representations of indices to numbers in order
        // to standardize the representation across the system.
        if (typeof (property) == 'string') {
            const numericalProperty = Number(property);
            property = isNaN(numericalProperty) ? property : numericalProperty;
        }
        return super.get(target, property) || target[property];
    }
    set(target, property, value) {
        if (value instanceof rxjs_1.Observable) {
            this.watchObservableProperty(target, property, value);
            return true;
        }
        const index = Number(property);
        if (isNaN(index)) {
            return false;
        }
        if (index < 0 || index >= target.length) {
            throw new RangeError(`Index ${index} is out of bounds`);
        }
        const oldValue = target[index];
        const newValue = this.listenFunction(value);
        target[index] = newValue;
        this.watchSubpropertyChanges(index, newValue);
        this.mutations.next(new Mutations.PropertyMutation(index, oldValue, newValue));
        return true;
    }
}
// ARRAY FUNCTION OVERRIDES
ArrayProxyHandler.ARRAY_FUNCTION_OVERRIDES = {
    push(proxy, target, item) {
        target.push.call(target, undefined);
        if (item instanceof rxjs_1.Observable) {
            proxy.watchObservableProperty(target, target.length - 1, item);
            return;
        }
        target[target.length - 1] = item;
        proxy.mutations.next(new Mutations.ArraySpliceMutation(target.length - 1, [], [item]));
    },
    splice(proxy, target, startIndex, deleteCount, ...insertedItems) {
        const spliceArgs = [startIndex, deleteCount];
        spliceArgs.push.apply(spliceArgs, insertedItems.map((value) => proxy.listenFunction(value)));
        // Some of the subproperty watchers may need to update after a splice because their key
        // (index) will have changed. For example, if there is an IWatchedArray at index 2 and a
        // new item is inserted at index 1, any future mutations to that IWatchedArray should be
        // reported as coming from index 3.
        proxy.remapPropertyKeys((currentKey) => {
            if (typeof (currentKey) == 'number') {
                if (currentKey < startIndex) {
                    return currentKey;
                }
                else if (currentKey < startIndex + deleteCount) {
                    return null;
                }
                else {
                    return currentKey + insertedItems.length;
                }
            }
            else {
                return currentKey;
            }
        });
        const deletedItems = target.splice.apply(target, spliceArgs);
        for (let i = 0; i < insertedItems.length; i++) {
            if (insertedItems[i] instanceof rxjs_1.Observable) {
                target[i + startIndex] = undefined;
                proxy.watchObservableProperty(target, startIndex + i, insertedItems[i]);
            }
        }
        proxy.mutations.next(new Mutations.ArraySpliceMutation(startIndex, deletedItems, insertedItems));
    },
};
exports.ArrayProxyHandler = ArrayProxyHandler;
