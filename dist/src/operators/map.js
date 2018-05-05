"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../../epoxy");
function map(collection, mapFunction) {
    const computedMapFunction = (val, key) => epoxy_1.optionallyComputed(() => mapFunction(val, key));
    const initialValue = initialMapping(collection, computedMapFunction);
    const mappedCollection = epoxy_1.makeListenable(initialValue);
    collection.listen().subscribe((mutation) => {
        let mappedMutation = mutation.copy();
        if (!collection.hasOwnProperty(mappedMutation.key)) {
            const currentMappedValue = mappedCollection[mappedMutation.key];
            mappedMutation = new epoxy_1.PropertyMutation(mappedMutation.key, currentMappedValue, undefined);
            delete mappedCollection[mappedMutation.key];
        }
        else if (mappedMutation instanceof epoxy_1.ValueMutation) {
            mappedMutation.newValue = initialMapping(mappedMutation.newValue, mapFunction);
        }
        else if (mappedMutation instanceof epoxy_1.PropertyMutation) {
            const currentMapepdValue = mappedCollection[mappedMutation.key];
            mappedMutation.oldValue = currentMapepdValue;
            mappedMutation.newValue = mapFunction(mappedMutation.newValue, mappedMutation.key);
        }
        else if (mappedMutation instanceof epoxy_1.SubpropertyMutation) {
            const currentMappedValue = mappedCollection[mappedMutation.key];
            const key = mappedMutation.key;
            const currentValue = collection[key];
            mappedMutation = new epoxy_1.PropertyMutation(key, currentMappedValue, mapFunction(currentValue, mappedMutation.key));
        }
        else if (mappedMutation instanceof epoxy_1.ArraySpliceMutation) {
            mappedMutation.deleted = mappedMutation.deleted.map(mapFunction);
            mappedMutation.inserted = mappedMutation.inserted.map(mapFunction);
        }
        mappedCollection.applyMutation(mappedMutation);
    });
    return mappedCollection.asReadonly();
}
exports.map = map;
/**
 * Returns a version of the input data structure where every value has been passed through the
 * map function.
 */
function initialMapping(collection, mapFunction) {
    if (collection instanceof Array) {
        return collection.map(mapFunction);
    }
    else {
        const mappedObject = {};
        for (let key in collection) {
            if (!collection.hasOwnProperty(key))
                continue;
            mappedObject[key] = mapFunction(collection[key], key);
        }
        return mappedObject;
    }
}
