import * as Mutations from './mutations';
import {IListenableArray, WatchType, IListenableObject} from './types';
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
            this.watchSubpropertyChanges(key, initialValues[key]);
        });
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
        this.watchSubpropertyChanges(property, newValue);
        this.mutations.next(new Mutations.PropertyMutation(property, oldValue, newValue))
        return true;
    }

    deleteProperty(target: T, property: PropertyKey) {
        this.removeSubpropertyWatcher(property);
        return delete target[property];
    }
}