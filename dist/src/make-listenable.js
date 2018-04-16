"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const array_proxy_1 = require("./array-proxy");
const object_proxy_1 = require("./object-proxy");
function makeListenable(input) {
    if (input.listen && input.listen instanceof Function) {
        return input;
    }
    if (input instanceof Array) {
        const watchedInput = input.map(makeListenable);
        const handler = new array_proxy_1.ArrayProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler);
        handler.setOutput(output);
        return output;
    }
    else if (input instanceof Object) {
        const watchedInput = {};
        for (let key in input) {
            watchedInput[key] = makeListenable(input[key]);
        }
        const handler = new object_proxy_1.ObjectProxyHandler(makeListenable, watchedInput);
        const output = new Proxy(watchedInput, handler);
        handler.setOutput(output);
        return output;
    }
    else {
        return input;
    }
}
exports.makeListenable = makeListenable;
