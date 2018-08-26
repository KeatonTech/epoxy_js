/**
 * Exception that fires when the user attempts to modify a value on a readonly object.
 */
export class ReadonlyException extends Error {};


/**
 * Proxy handler that blocks all mutation operations on a generic object.
 */
export class ReadonlyProxyHandler<T extends object> implements ProxyHandler<T> {
    private static GENERIC_DISALLOWED_KEYS = {
        applyMutation: true,
        setComputed: true,
        unapplyMutation: true,
        broadcastCurrentValue: true,
    };
    
    get(target: T, property: string | number) {
        if (ReadonlyProxyHandler.GENERIC_DISALLOWED_KEYS.hasOwnProperty(property)) {
            throw new ReadonlyException(`Cannot get property ${property} on a readonly object.`);
        }
        return target[property];
    }

    set(target: T, property: string | number, value: any): boolean {
        throw new ReadonlyException(`Cannot set property ${property} on a readonly object`);
    }

    deleteProperty(target: T, property: string | number): boolean {
        throw new ReadonlyException(`Cannot delete property ${property} on a readonly object`);
    }
}


/**
 * Proxy handler that blocks all mutation operations on an Array object.
 */
export class ReadonlyArrayProxyHandler<T> extends ReadonlyProxyHandler<T[]> {
    private static ARRAY_DISALLOWED_KEYS = {
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
    
    get(target: T[], property: string | number) {
        if (ReadonlyArrayProxyHandler.ARRAY_DISALLOWED_KEYS.hasOwnProperty(property)) {
            throw new ReadonlyException(`Cannot get property ${property} on a readonly array.`);
        }
        return super.get(target, property);
    }
}
