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
        Object.keys(initialValues).forEach((key: string | number) => {
            this.watchSubpropertyChanges(initialValues, key, initialValues[key]);
        });
    }

    // Prototype of the input object, used to call through to prototype functions.
    public inputPrototype: object;

    // Constructor function used to create the original object.
    private originalConstructor: Function;

    static createProxy<T extends object>(initialValue: TypedObject<T> = {}) {
        const watchedInput = {};
        for (let key in initialValue) {
            watchedInput[key as string] = makeListenable(initialValue[key]);
        }
        const handler = new ObjectProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler) as IListenableObject<WatchType>;
        handler.setOutput(output);
        handler.originalConstructor = initialValue.constructor;
        handler.inputPrototype = initialValue.constructor.prototype;
        return output as IListenableObject<T>;
    }

    copyData(target: Object) {
        return {...target};
    }

    applyMutationInternal(target: T, mutation: Mutations.Mutation<any>) {
        if (mutation instanceof Mutations.PropertyMutation && mutation.newValue === undefined) {
            delete target[mutation.key];
        } else if (mutation instanceof Mutations.ValueMutation) {
            Object.keys(target).forEach((key) => delete target[key]);
            Object.keys(mutation.newValue).forEach((key) => {
                target[key] = this.listenFunction(mutation.newValue[key]);
            });
        } else {
            super.applyMutationInternal(target, mutation);
        }
    }


    // PROXY FUNCTIONS

    get(target: T, property: string | number) {
        EpoxyGlobalState.registerGetterCall(this.output, property);
        if (property === 'constructor') return this.originalConstructor;
        return super.get(target, property) 
            || (this.inputPrototype && this.inputPrototype[property])
            || target[property];
    }

    set(target: T, property: string | number, value: T | Observable<T>) {
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

    deleteProperty(target: T, property: string | number) {
        this.removeSubpropertyWatcher(property);
        const oldValue = target[property];
        this.applyMutation(target, new Mutations.PropertyMutation(property, oldValue, undefined));
        return true;
    }

    getPrototypeOf(target: T) {
        return this.inputPrototype;
    }
}