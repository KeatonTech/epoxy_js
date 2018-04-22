"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const array_proxy_1 = require("./array-proxy");
const object_proxy_1 = require("./object-proxy");
function makeListenable(input) {
    if (input.listen && input.listen instanceof Function) {
        return input;
    }
    if (input instanceof Array) {
        return array_proxy_1.ArrayProxyHandler.createProxy(input);
    }
    else if (input instanceof Object) {
        return object_proxy_1.ObjectProxyHandler.createProxy(input);
    }
    else {
        return input;
    }
}
exports.makeListenable = makeListenable;
