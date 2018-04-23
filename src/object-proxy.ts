import * as Mutations from './mutations';
import {makeListenable} from './make-listenable';
import {IListenableArray, WatchType, IListenableObject, TypedObject} from './types';
import {BaseProxyHandler} from './base-proxy';
import {Observable, Subject} from 'rxjs';

/**
 * Proxy handler for Array objects.
 */
export class ObjectProxyHandler<T extends Object> extends BaseProxyHandler<T> {
    constructor(
        listenFunction: (input: WatchType) => any,
        private initialValues: T,
    ) {
        super(listenFunction);
        Object.keys(initialValues).forEach((key: PropertyKey) => {
            this.watchSubpropertyChanges(initialValues, key, initialValues[key]);
        });
    }

    static createProxy<T extends object>(initialValue: TypedObject<T> = {}) {
        const watchedInput = {};
        for (let key in initialValue) {
            watchedInput[key as string] = makeListenable(initialValue[key]);
        }
        const handler = new ObjectProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableObject<WatchType>;
        handler.setOutput(output);
        return output as IListenableObject<T>;
    }

    copyData(target: Object) {
        return {...target};
    }


    // PROXY FUNCTIONS

    get(target: T, property: PropertyKey) {
        return super.get(target, property) || target[property];
    }

    set(target: T, property: PropertyKey, value: T | Observable<T>) {
        if (value instanceof Observable) {
            this.watchObservableProperty(target, property, value);
            return true;
        }

        const oldValue = target[property];
        const newValue = this.listenFunction(value as any);
        target[property] = newValue as T;

        this.removeSubpropertyWatcher(property);
        this.watchSubpropertyChanges(target, property, newValue);
        this.mutations.next(new Mutations.PropertyMutation(property, oldValue, newValue))
        return true;
    }

    deleteProperty(target: T, property: PropertyKey) {
        this.removeSubpropertyWatcher(property);
        const oldValue = target[property];
        const deleted = delete target[property];
        this.mutations.next(new Mutations.PropertyMutation(property, oldValue, undefined));
        return deleted;
    }
}