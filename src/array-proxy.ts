import * as Mutations from './mutations';
import {makeListenable} from './make-listenable';
import {IListenableArray, WatchType} from './types';
import {BaseProxyHandler} from './base-proxy';
import {Observable, Subject} from 'rxjs';

/**
 * Proxy handler for Array objects.
 */
export class ArrayProxyHandler<T> extends BaseProxyHandler<T[]> {
    constructor(
        listenFunction: (input: WatchType) => any,
        private initialValues: WatchType[],
    ) {
       super(listenFunction);
       initialValues.forEach((value, index) => {
           return this.watchSubpropertyChanges(initialValues as any[], index, value);
       });
    }

    static createProxy<T extends WatchType>(initialValue: T[] = []) {
        const watchedInput = initialValue.map(makeListenable) as Array<WatchType>;
        const handler = new ArrayProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableArray<WatchType>;
        handler.setOutput(output);
        return output as IListenableArray<T>;
    }

    copyData(target: T[]) {
        return target.slice();
    }

    applyMutation(target: T[], mutation: Mutations.Mutation<any>) {
        if (mutation instanceof Mutations.ArraySpliceMutation) {
            const spliceArgs = [mutation.key as number, mutation.deleted.length];
            spliceArgs.push.apply(spliceArgs, mutation.inserted);
            target.splice.apply(target, spliceArgs);
            this.mutations.next(mutation);
        } else {
            super.applyMutation(target, mutation);
        }
    }


    // PROXY FUNCTIONS

    get(target: T[], property: PropertyKey) {
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
        if (typeof(property) == 'string') {
            const numericalProperty = Number(property);
            property = isNaN(numericalProperty) ? property : numericalProperty;
        }
        return super.get(target, property) || target[property];
    }

    set(target: T[], property: PropertyKey, value: T | Observable<T>) {
        if (value instanceof Observable) {
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
        const newValue = this.listenFunction(value as any);
        target[index] = newValue as T;

        this.watchSubpropertyChanges(target, index, newValue);
        this.mutations.next(new Mutations.PropertyMutation(index, oldValue, newValue))
        return true;
    }


    // ARRAY FUNCTION OVERRIDES

    private static ARRAY_FUNCTION_OVERRIDES = {

        push<T>(proxy: ArrayProxyHandler<T>, target: T[], item: T | Observable<T>) {
            target.push.call(target, undefined);

            if (item instanceof Observable) {
                proxy.watchObservableProperty(target, target.length - 1, item);
                return;
            }

            target[target.length - 1] = item;
            proxy.mutations.next(new Mutations.ArraySpliceMutation(target.length - 1, [], [item]));
        },
        
        splice<T>(
            proxy: ArrayProxyHandler<T>,
            target: T[],
            startIndex: number,
            deleteCount: number,
            ...insertedItems: Array<T | Observable<T>>
        ) {
            const spliceArgs = [startIndex, deleteCount];
            spliceArgs.push.apply(
                spliceArgs,
                insertedItems.map((value) => proxy.listenFunction(value as WatchType)));

            // Some of the subproperty watchers may need to update after a splice because their key
            // (index) will have changed. For example, if there is an IWatchedArray at index 2 and a
            // new item is inserted at index 1, any future mutations to that IWatchedArray should be
            // reported as coming from index 3.
            proxy.remapPropertyKeys((currentKey: PropertyKey) => {
                if (typeof(currentKey) == 'number') {
                    if (currentKey < startIndex) {
                        return currentKey
                    } else if (currentKey < startIndex + deleteCount) {
                        return null;
                    } else {
                        return currentKey + insertedItems.length;
                    }
                } else {
                    return currentKey;
                }
            });

            const deletedItems = target.splice.apply(target, spliceArgs);
            for (let i = 0; i < insertedItems.length; i++) {
                if (insertedItems[i] instanceof Observable) {
                    (target[i + startIndex] as any) = undefined;
                    proxy.watchObservableProperty(target, startIndex + i, insertedItems[i] as Observable<T>);
                }
            }

            proxy.mutations.next(new Mutations.ArraySpliceMutation(startIndex, deletedItems, insertedItems));
        },
    };
}