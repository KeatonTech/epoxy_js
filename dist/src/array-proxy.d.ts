import * as Mutations from './mutations';
import { WatchType } from './types';
import { BaseProxyHandler } from './base-proxy';
import { Observable } from 'rxjs';
/**
 * Proxy handler for Array objects.
 */
export declare class ArrayProxyHandler<T> extends BaseProxyHandler<T[]> {
    private initialValues;
    constructor(listenFunction: (input: WatchType) => any, initialValues: WatchType[]);
    copyData(target: T[]): T[];
    applyMutation(target: T[], mutation: Mutations.Mutation<any>): void;
    get(target: T[], property: PropertyKey): any;
    set(target: T[], property: PropertyKey, value: T | Observable<T>): boolean;
    private ARRAY_FUNCTION_OVERRIDES;
}
