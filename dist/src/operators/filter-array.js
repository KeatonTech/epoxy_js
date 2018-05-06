"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../../epoxy");
/**
 * Takes a listenable array and creates a new readonly listenable array containing
 * only those values that pass the predicate test specified in the filter function.
 */
function filterArray(collection, filterFunction) {
    const initialFiltered = trackedFilter(collection, filterFunction);
    const listenableFiltered = epoxy_1.makeListenable(initialFiltered.list);
    collection.listen().subscribe((mutation) => {
        if (mutation instanceof epoxy_1.ArraySpliceMutation) {
            filterSplice(initialFiltered, mutation, filterFunction);
        }
        else {
            filterPropertyChange(initialFiltered, filterFunction, mutation, collection[mutation.key]);
        }
    });
    return listenableFiltered.asReadonly();
}
exports.filterArray = filterArray;
/**
 * Filters a list given a filter function and returns a FilteredWithIndices object.
 */
function trackedFilter(list, filterFunction) {
    const ret = {
        list: null,
        filteredIndices: [],
        inFiltered: [],
    };
    const filteredList = [];
    let currentIndex = 0;
    for (const item of list) {
        ret.filteredIndices.push(currentIndex);
        const passesFilter = filterFunction(item);
        ret.inFiltered.push(passesFilter);
        if (passesFilter) {
            filteredList.push(item);
            currentIndex++;
        }
    }
    ret.list = epoxy_1.makeListenable(filteredList);
    return ret;
}
/**
 * Applies a splice operation to and IndexTrackedFiltered array, filtering its items.
 */
function filterSplice(filtered, splice, filterFunction) {
    const inputListStart = splice.key;
    // Handle Deletions
    for (let i = inputListStart + splice.deleted.length - 1; i >= inputListStart; i--) {
        if (filtered.inFiltered[i]) {
            filtered.list.splice(filtered.filteredIndices[i], 1);
            incrementAllAfter(filtered.filteredIndices, i, -1);
        }
        filtered.inFiltered.splice(i, 1);
        filtered.filteredIndices.splice(i, 1);
    }
    // Handle Insertions
    if (splice.inserted.length > 0) {
        const filteredListStart = filtered.filteredIndices[inputListStart] || filtered.list.length;
        for (let i = splice.inserted.length - 1; i >= 0; i--) {
            const passesFilter = filterFunction(splice.inserted[i]);
            filtered.inFiltered.splice(inputListStart, 0, passesFilter);
            filtered.filteredIndices.splice(inputListStart, 0, filteredListStart);
            if (passesFilter) {
                filtered.list.splice(filteredListStart, 0, splice.inserted[i]);
                incrementAllAfter(filtered.filteredIndices, inputListStart);
            }
        }
    }
}
/**
 * Applies a property change mutation, updating the filtering as necessary.
 */
function filterPropertyChange(filtered, filterFunction, mutation, newValue) {
    const index = mutation.key;
    const currentlyFiltered = filtered.inFiltered[index];
    const newFiltered = filterFunction(newValue);
    const filteredListStart = filtered.filteredIndices[index];
    if (newFiltered && currentlyFiltered) {
        const mappedMutation = mutation.copy();
        mappedMutation.key = filteredListStart;
        filtered.list.applyMutation(mappedMutation);
    }
    if (newFiltered === currentlyFiltered) {
        return;
    }
    filtered.inFiltered[index] = newFiltered;
    if (newFiltered) {
        filtered.list.splice(filteredListStart, 0, newValue);
        incrementAllAfter(filtered.filteredIndices, index, 1);
    }
    else {
        filtered.list.splice(filteredListStart, 1);
        incrementAllAfter(filtered.filteredIndices, index, -1);
    }
}
/**
 * Increments every value in a list after a given index.
 */
function incrementAllAfter(list, startIndex, delta = 1) {
    for (let i = startIndex + 1; i < list.length; i++) {
        list[i] += delta;
    }
}
