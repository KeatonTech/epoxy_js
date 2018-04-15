import { ArrayProxyHandler } from './array-proxy';
import { IListenableArray, IListenableObject, WatchType, IListenable } from './types';
import { ObjectProxyHandler } from './object-proxy';

 /**
  * Takes a data structure and returns a version of that data structure that can be watched.
  * Note that if the user passes in a primitive value it will be returned as-is.
  */
 export function makeListenable<T>(input: Array<T>): IListenableArray<T>;
 export function makeListenable<T>(input: {[key: string]: T}): IListenableObject<T>;
 export function makeListenable<T>(input: IListenable<T>): IListenable<T>;
 export function makeListenable<T>(input: T): T;
 export function makeListenable<T extends WatchType>(input: T): WatchType {
    if ((input as IListenable<any>).listen &&  (input as IListenable<any>).listen instanceof Function) {
        return input;
    }
    if (input instanceof Array) {
        const watchedInput = input.map(makeListenable) as Array<WatchType>;
        const handler = new ArrayProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableArray<WatchType>;
        handler.setOutput(output);
        return output;
    } else if (input instanceof Object) {
        const watchedInput = {};
        for (let key in input) {
            watchedInput[key as string] = makeListenable(input[key]);
        }
        const handler = new ObjectProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableObject<WatchType>;
        handler.setOutput(output);
        return output;
    } else {
        return input;
    }
}