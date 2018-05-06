"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../../epoxy");
const filter_array_1 = require("./filter-array");
function filter(collection, filterFunction) {
    if (collection instanceof Array) {
        return filter_array_1.filterArray(collection, filterFunction);
    }
    else if (collection) {
        // Object filtering
        const filteredListenable = epoxy_1.makeListenable(filterObject(collection, filterFunction));
        collection.listen().subscribe((mutation) => {
            if (filterFunction(collection[mutation.key])) {
                filteredListenable.applyMutation(mutation);
            }
            else {
                delete filteredListenable[mutation.key];
            }
        });
        return filteredListenable.asReadonly();
    }
}
exports.filter = filter;
/**
 * Filter an objects keys to only those whose values pass a test.
 */
function filterObject(input, filterFunction) {
    const ret = {};
    for (const key in input) {
        if (filterFunction(input[key])) {
            ret[key] = input[key];
        }
    }
    return ret;
}
