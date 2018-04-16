import { EpoxyGlobalState } from "./global-state";

export function Transaction(target: Function, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
    const originalFunction = descriptor.value;
    if (!originalFunction) return;
    descriptor.value = (...args) => {
        EpoxyGlobalState.isBatching = true;
        originalFunction.apply(this as any, args);
        EpoxyGlobalState.isBatching = false;
    };
}