import {
    Listenable, ListenableCollection, TypedObject, 
    ValueMutation, PropertyMutation, SubpropertyMutation, ArraySpliceMutation,
    makeListenable, optionallyComputed 
} from "../../epoxy";

export type MapFunction<T, U>= (T, PropertyKey) => U;

/**
 * Takes a listenable data structure and creates a new readonly listenable
 * data structure whose values are derived from the values in the original
 * structure using a mapping function. This mapping function can depend on
 * values from other Epoxy listenable data structures.
 */
export function map<T, U>(
    collection: Listenable<Array<T>>,
    mapFunction: MapFunction<T, U>,
    allowComputedMapFunction?: boolean,
    ignoreSubpropertyMutations?: boolean,
): Listenable<Array<U>>;
export function map<T, U>(
    collection: Listenable<TypedObject<T>>,
    mapFunction: MapFunction<T, U>,
    allowComputedMapFunction?: boolean,
    ignoreSubpropertyMutations?: boolean,
): Listenable<TypedObject<U>>;
export function map<T, U>(
    collection: ListenableCollection,
    mapFunction: MapFunction<T, U>,
    allowComputedMapFunction = true,
    ignoreSubpropertyMutations = false,
): ListenableCollection {
    const computedMapFunction = allowComputedMapFunction ?
        (val, key) => optionallyComputed(() => mapFunction(val, key)):
        mapFunction;
    const initialValue = initialMapping(collection, computedMapFunction);
    const mappedCollection = makeListenable(initialValue) as ListenableCollection;

    collection.listen().subscribe((mutation) => {
        let mappedMutation = mutation.copy();

        if (mappedMutation instanceof ArraySpliceMutation) {
            const index = mappedMutation.key as number;
            mappedMutation.deleted = (mappedCollection as {}[]).slice(
                index, index + mappedMutation.deleted.length);
            mappedMutation.inserted = mappedMutation.inserted.map(mapFunction);
        } else if (!collection.hasOwnProperty(mappedMutation.key)) {
            const currentMappedValue = mappedCollection[mappedMutation.key];
            mappedMutation = new PropertyMutation(mappedMutation.key, currentMappedValue, undefined);
            delete mappedCollection[mappedMutation.key];
        } else if (mappedMutation instanceof ValueMutation) {
            mappedMutation.newValue = initialMapping(mappedMutation.newValue, mapFunction);
        } else if (mappedMutation instanceof PropertyMutation) {
            const currentMapepdValue = mappedCollection[mappedMutation.key];
            mappedMutation.oldValue = currentMapepdValue;
            mappedMutation.newValue = mapFunction(mappedMutation.newValue, mappedMutation.key);
        } else if (mappedMutation instanceof SubpropertyMutation) {
            if (ignoreSubpropertyMutations) return;
            const currentMappedValue = mappedCollection[mappedMutation.key];
            const key = mappedMutation.key;
            const currentValue = collection[key];
            mappedMutation = new PropertyMutation(
                key, currentMappedValue, mapFunction(currentValue, mappedMutation.key));
        }

        mappedCollection.applyMutation(mappedMutation);
    })

    return mappedCollection.asReadonly();
}


/**
 * Returns a version of the input data structure where every value has been passed through the
 * map function.
 */
function initialMapping<T, U>(
    collection: ListenableCollection, mapFunction: MapFunction<T, U>): U[] | TypedObject<U> {
    if (collection instanceof Array) {
        return collection.map(mapFunction);
    } else {
        const mappedObject = {};
        for (let key in collection) {
            if (!collection.hasOwnProperty(key)) continue;
            mappedObject[key] = mapFunction(collection[key], key);
        }
        return mappedObject;
    }
}