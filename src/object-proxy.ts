import * as Mutations from './mutations';
import {makeListenable} from './make-listenable';
import {IListenableArray, WatchType, IListenableObject, TypedObject} from './types';
import {BaseProxyHandler} from './base-proxy';
import {Observable, Subject} from 'rxjs';
import { EpoxyGlobalState } from '../epoxy';

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

    // Prototype of the input object, used to call through to prototype functions.
    public inputPrototype: object;

    static createProxy<T extends object>(initialValue: TypedObject<T> = {}) {
        const watchedInput = {};
        for (let key in initialValue) {
            watchedInput[key as string] = makeListenable(initialValue[key]);
        }
        const handler = new ObjectProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableObject<WatchType>;
        handler.setOutput(output);
        handler.inputPrototype = initialValue.constructor.prototype;
        return output as IListenableObject<T>;
    }

    copyData(target: Object) {
        return {...target};
    }

    applyMutation(target: T, mutation: Mutations.Mutation<any>, doNotBroadcast = false) {
        if (mutation instanceof Mutations.PropertyMutation && mutation.newValue === undefined) {
            delete target[mutation.key];
            if (!doNotBroadcast) this.broadcastMutation(target, mutation);
        } else {
            super.applyMutation(target, mutation, doNotBroadcast);
        }
    }


    // PROXY FUNCTIONS

    get(target: T, property: PropertyKey) {
        EpoxyGlobalState.registerGetterCall(this.output, property);
        return super.get(target, property) 
            || (this.inputPrototype && this.inputPrototype[property])
            || target[property];
    }

    set(target: T, property: PropertyKey, value: T | Observable<T>) {
        if (value instanceof Observable) {
            this.watchObservableProperty(target, property, value);
            return true;
        }

        const oldValue = target[property];
        const newValue = this.listenFunction(value as any);

        this.removeSubpropertyWatcher(property);
        this.applyMutation(target, new Mutations.PropertyMutation(property, oldValue, newValue))
        this.watchSubpropertyChanges(target, property, newValue);
        return true;
    }

    deleteProperty(target: T, property: PropertyKey) {
        this.removeSubpropertyWatcher(property);
        const oldValue = target[property];
        this.applyMutation(target, new Mutations.PropertyMutation(property, oldValue, undefined));
        return true;
    }
}