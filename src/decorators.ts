import { EpoxyGlobalState } from "./global-state";

export function Transaction(target: Function, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
    const originalFunction = descriptor.value;
    descriptor.value = () => {
        EpoxyGlobalState.isBatching = true;
        originalFunction.apply(this, arguments);
        EpoxyGlobalState.isBatching = false;
    };
}