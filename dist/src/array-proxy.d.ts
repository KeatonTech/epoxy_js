import * as Mutations from './mutations';
import { IListenableArray, WatchType } from './types';
import { BaseProxyHandler } from './base-proxy';
import { Observable } from 'rxjs';
/**
 * Proxy handler for Array objects.
 */
export declare class ArrayProxyHandler<T> extends BaseProxyHandler<T[]> {
    private initialValues;
    constructor(listenFunction: (input: WatchType) => any, initialValues: WatchType[]);
    static createProxy<T extends WatchType>(initialValue?: T[]): IListenableArray<T>;
    copyData(target: T[]): T[];
    applyMutation(target: T[], mutation: Mutations.Mutation<any>): void;
    get(target: T[], property: PropertyKey): any;
    set(target: T[], property: PropertyKey, value: T | Observable<T>): boolean;
    private static ARRAY_FUNCTION_OVERRIDES;
}
