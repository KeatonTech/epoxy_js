import { EpoxyGlobalState } from "./global-state";

export function Transaction(name?: string) {
    return BatchOperation(name, true);
}

export function runTransaction(name: string, fn: Function);
export function runTransaction(fn: Function);
export function runTransaction(nameOrFn: string | Function, fn?: Function) {
    runInBatch(nameOrFn, fn, true);
}

export function BatchOperation(name?: string, rollbackOnError = false) {
    return (target: Function, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) => {
        const originalFunction = descriptor.value;
        if (!originalFunction) return;
        descriptor.value = (...args) => {
            EpoxyGlobalState.runInBatch(
                name || propertyName,
                () => originalFunction.apply(this as any, args),
                rollbackOnError);
        };
    };
}

export function runInBatch(name: string, fn: Function);
export function runInBatch(fn: Function);
export function runInBatch(name: string, fn: Function, rollbackOnError: boolean);
export function runInBatch(nameOrFn: string | Function, fn: Function, rollbackOnError: boolean);
export function runInBatch(nameOrFn: string | Function, fn?: Function, rollbackOnError = false) {
    let name: string;
    if (nameOrFn instanceof Function) {
        fn = nameOrFn;
        name = null;
    } else {
        name = nameOrFn;
    }

    EpoxyGlobalState.runInBatch(name, fn, rollbackOnError);
}