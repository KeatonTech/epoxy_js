import { ArraySpliceMutation, Listenable, PropertyMutation, ValueMutation } from "../../epoxy";
import { makeListenable } from "../make-listenable";
import { map } from "./map";

/**
 * Converts an Array to an Object by using a function to get a key for each item.
 * If two Array items evaluate to the same key an error will be thrown.
 */
export function toObject<V>(
    listenableArray: Listenable<Array<V>>,
    getKey: (V) => string
): Listenable<{[key: string]: V}> {
    const keys = map(listenableArray, getKey);

    const initialObject = {};
    repopulateObject(initialObject, keys, listenableArray);
    const listenableObject = makeListenable(initialObject);

    keys.listen().subscribe((mutation) => {
        if (mutation instanceof ArraySpliceMutation) {
            const startIndex = mutation.key as number;
            for (const deleted of mutation.deleted) {
                delete listenableObject[deleted];
            }
            for (let i = startIndex; i < startIndex + mutation.inserted.length; i++) {
                addItemToObject(listenableObject, keys[i], listenableArray[i]);
            }

        } else if (mutation instanceof ValueMutation) {
            repopulateObject(listenableObject, keys, listenableArray);

        } else if (mutation instanceof PropertyMutation) {
            delete listenableObject[mutation.oldValue];
            const index = mutation.key as number;
            addItemToObject(listenableObject, keys[index], listenableArray[index]);

        } else {
            throw new Error(`Unsupported mutation type: ${mutation.constructor.toString()}`);
        }
    });

    return listenableObject.asReadonly();
}

/**
 * Populates an object given a list of keys and a list of values. Clears any existing values in
 * the input object.
 */
function repopulateObject<V>(
    object: {[key: string]: V},
    keys: string[],
    values: V[]
): void {
    if (keys.length !== values.length) {
        throw new Error('Mismatch between keys and values');
    }
    for (const key of Object.keys(object)) {
        delete object[key];
    }
    for (let i = 0; i < keys.length; i++) {
        addItemToObject(object, keys[i], values[i]);
    }
}

/**
 * Adds a new key-value pair to an object, ensuring that it does not conflict with an existing key.
 */
function addItemToObject<V>(
    object: {[key: string]: V},
    key: string,
    value: V
): void {
    if (object.hasOwnProperty(key)) {
        throw new Error(`Key ${key} already exists in object.`)
    }
    object[key] = value;
}