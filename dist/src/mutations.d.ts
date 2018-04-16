export declare abstract class Mutation<T> {
    key: PropertyKey;
    constructor(key: PropertyKey);
}
export declare class PropertyMutation<T> extends Mutation<T> {
    oldValue: T;
    newValue: T;
    constructor(key: PropertyKey, oldValue: T, newValue: T);
}
export declare class SubpropertyMutation<T> extends Mutation<T> {
    mutation: Mutation<any>;
    constructor(key: PropertyKey, mutation: Mutation<any>);
}
export declare class ArraySpliceMutation<T> extends Mutation<T> {
    deleted: Array<T>;
    inserted: Array<T>;
    constructor(key: number, deleted: Array<T>, inserted: Array<T>);
}
/**
 * Returns a mutation that cancels out the given mutation, essentially undoing it.
 */
export declare function invertMutation<T>(mutation: Mutation<T>): Mutation<T>;
