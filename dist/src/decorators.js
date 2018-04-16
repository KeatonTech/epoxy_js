"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const global_state_1 = require("./global-state");
function Transaction(target, propertyName, descriptor) {
    const originalFunction = descriptor.value;
    if (!originalFunction)
        return;
    descriptor.value = (...args) => {
        global_state_1.EpoxyGlobalState.isBatching = true;
        originalFunction.apply(this, args);
        global_state_1.EpoxyGlobalState.isBatching = false;
    };
}
exports.Transaction = Transaction;
