import * as Mutations from './mutations';
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
       initialValues.forEach((value, index) => this.watchSubpropertyChanges(index, value));
    }

    copyData(target: T[]) {
        return target.slice();
    }

    applyMutation(target: T[], mutation: Mutations.Mutation<any>) {
        if (mutation instanceof Mutations.ArraySpliceMutation) {
            const spliceArgs = [mutation.key as number, mutation.deleted.length];
            spliceArgs.push.apply(spliceArgs, mutation.inserted);
            target.splice.apply(target, spliceArgs);
        } else {
            super.applyMutation(target, mutation);
        }
    }


    // PROXY FUNCTIONS

    get(target: T[], property: PropertyKey) {
        // Override array functions
        if (this.ARRAY_FUNCTION_OVERRIDES.hasOwnProperty(property)) {
            let value = this.ARRAY_FUNCTION_OVERRIDES[property];
            if (value instanceof Function) {
                value = value.bind(this, target);
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

    set(target: T[], property: PropertyKey, value: T) {
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

        this.watchSubpropertyChanges(index, newValue);
        this.mutations.next(new Mutations.PropertyMutation(index, oldValue, newValue))
        return true;
    }


    // ARRAY FUNCTION OVERRIDES

    private ARRAY_FUNCTION_OVERRIDES = {

        push(target: T[], item: T) {
            target.push.call(target, this.listenFunction(item));
            this.mutations.next(new Mutations.ArraySpliceMutation(target.length - 1, [], [item]));
        },
        
        splice(target: T[], startIndex: number, deleteCount: number, ...insertedItems: T[]) {
            const spliceArgs = [startIndex, deleteCount];
            spliceArgs.push.apply(spliceArgs, insertedItems.map(this.listenFunction));

            // Some of the subproperty watchers may need to update after a splice because their key
            // (index) will have changed. For example, if there is an IWatchedArray at index 2 and a
            // new item is inserted at index 1, any future mutations to that IWatchedArray should be
            // reported as coming from index 3.
            this.remapSubpropertyKeys((currentKey: PropertyKey) => {
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
            this.mutations.next(new Mutations.ArraySpliceMutation(startIndex, deletedItems, insertedItems));
        },
    };
}