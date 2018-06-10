import { EpoxyGlobalState } from "./global-state";

export function Transaction(name?: string) {
    return (target: Function, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) => {
        const originalFunction = descriptor.value;
        if (!originalFunction) return;
        descriptor.value = (...args) => {
            EpoxyGlobalState.runInBatch(
                name || propertyName,
                () => originalFunction.apply(this as any, args));
        };
    };
}

export function runTransaction(name: string, fn: Function);
export function runTransaction(fn: Function);
export function runTransaction(nameOrFn: string | Function, fn?: Function) {
    let name: string;
    if (nameOrFn instanceof Function) {
        fn = nameOrFn;
        name = null;
    } else {
        name = nameOrFn;
    }

    EpoxyGlobalState.runInBatch(name, fn);
}