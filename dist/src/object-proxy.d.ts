/// <reference types="chai" />
import { WatchType, IListenableObject, TypedObject } from './types';
import { BaseProxyHandler } from './base-proxy';
import { Observable } from 'rxjs';
/**
 * Proxy handler for Array objects.
 */
export declare class ObjectProxyHandler<T extends Object> extends BaseProxyHandler<T> {
    private initialValues;
    constructor(listenFunction: (input: WatchType) => any, initialValues: T);
    static createProxy<T extends object>(initialValue?: TypedObject<T>): IListenableObject<T>;
    copyData(target: Object): {
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: string): boolean;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: string): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
        should: Chai.Assertion;
    };
    get(target: T, property: PropertyKey): any;
    set(target: T, property: PropertyKey, value: T | Observable<T>): boolean;
    deleteProperty(target: T, property: PropertyKey): boolean;
}
