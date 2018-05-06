"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Exception that fires when the user attempts to modify a value on a readonly object.
 */
class ReadonlyException extends Error {
}
exports.ReadonlyException = ReadonlyException;
;
/**
 * Proxy handler that blocks all mutation operations on a generic object.
 */
class ReadonlyProxyHandler {
    get(target, property) {
        if (ReadonlyProxyHandler.GENERIC_DISALLOWED_KEYS.hasOwnProperty(property)) {
            throw new ReadonlyException(`Cannot get property ${property} on a readonly object.`);
        }
        return target[property];
    }
    set(target, property, value) {
        throw new ReadonlyException(`Cannot set property ${property} on a readonly object`);
    }
    deleteProperty(target, property) {
        throw new ReadonlyException(`Cannot delete property ${property} on a readonly object`);
    }
}
ReadonlyProxyHandler.GENERIC_DISALLOWED_KEYS = {
    applyMutation: true,
    setComputed: true,
    unapplyMutation: true,
    broadcastCurrentValue: true,
};
exports.ReadonlyProxyHandler = ReadonlyProxyHandler;
/**
 * Proxy handler that blocks all mutation operations on an Array object.
 */
class ReadonlyArrayProxyHandler extends ReadonlyProxyHandler {
    get(target, property) {
        if (ReadonlyArrayProxyHandler.ARRAY_DISALLOWED_KEYS.hasOwnProperty(property)) {
            throw new ReadonlyException(`Cannot get property ${property} on a readonly array.`);
        }
        return super.get(target, property);
    }
}
ReadonlyArrayProxyHandler.ARRAY_DISALLOWED_KEYS = {
    copyWithin: true,
    fill: true,
    pop: true,
    push: true,
    splice: true,
    reverse: true,
    shift: true,
    sort: true,
    unshift: true,
};
exports.ReadonlyArrayProxyHandler = ReadonlyArrayProxyHandler;
