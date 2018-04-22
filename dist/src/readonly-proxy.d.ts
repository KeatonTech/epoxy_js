/**
 * Exception that fires when the user attempts to modify a value on a readonly object.
 */
export declare class ReadonlyException extends Error {
}
/**
 * Proxy handler that blocks all mutation operations on a generic object.
 */
export declare class ReadonlyProxyHandler<T extends object> implements ProxyHandler<T> {
    private static GENERIC_DISALLOWED_KEYS;
    get(target: T, property: PropertyKey): any;
    set(target: T, property: PropertyKey, value: any): boolean;
    deleteProperty(target: T, property: PropertyKey): boolean;
}
/**
 * Proxy handler that blocks all mutation operations on an Array object.
 */
export declare class ReadonlyArrayProxyHandler<T> extends ReadonlyProxyHandler<T[]> {
    private static ARRAY_DISALLOWED_KEYS;
    get(target: T[], property: PropertyKey): any;
}
