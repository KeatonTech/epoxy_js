import {
    IListenableArray, IListenableObject, ListenableCollection, TypedObject, 
    Mutation, ArraySpliceMutation,
    makeListenable, optionallyComputed 
} from "../../epoxy";

export type FilterFunction<T> = (T) => Boolean;

/**
 * Represents a filtered list and the way its indices map to the input list.
 */
interface IndexTrackedFiltered<T> {
    list: IListenableArray<T>;
    filteredIndices: number[];
    inFiltered: Boolean[];
}

/**
 * Takes a listenable array and creates a new readonly listenable array containing
 * only those values that pass the predicate test specified in the filter function.
 */
export function filterArray<T>(
    collection: IListenableArray<T>, 
    filterFunction: FilterFunction<T>
): IListenableArray<T> {
    const initialFiltered = trackedFilter(collection, filterFunction);
    const listenableFiltered = makeListenable(initialFiltered.list);

    collection.listen().subscribe((mutation) => {
        if (mutation instanceof ArraySpliceMutation) {
            filterSplice(initialFiltered, mutation, filterFunction);
        } else {
            filterPropertyChange(
                initialFiltered, filterFunction, mutation, collection[mutation.key]);
        }
    });

    return listenableFiltered.asReadonly();
}

/**
 * Filters a list given a filter function and returns a FilteredWithIndices object.
 */
function trackedFilter<T>(list: T[], filterFunction: FilterFunction<T>) {
    const ret: IndexTrackedFiltered<T> = {
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

    ret.list = makeListenable(filteredList);
    return ret;
}

/**
 * Applies a splice operation to and IndexTrackedFiltered array, filtering its items.
 */
function filterSplice<T>(
    filtered: IndexTrackedFiltered<T>,
    splice: ArraySpliceMutation<T>,
    filterFunction: FilterFunction<T>
) {
    const inputListStart = splice.key as number;

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
function filterPropertyChange<T>(
    filtered: IndexTrackedFiltered<T>,
    filterFunction: FilterFunction<T>,
    mutation: Mutation<T>,
    newValue: T,
) {
    const index = mutation.key as number;
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
    } else {
        filtered.list.splice(filteredListStart, 1);
        incrementAllAfter(filtered.filteredIndices, index, -1);
    }
}


/**
 * Increments every value in a list after a given index.
 */
function incrementAllAfter(list: number[], startIndex: number, delta = 1) {
    for (let i = startIndex + 1; i < list.length; i++) {
        list[i] += delta;
    }
}