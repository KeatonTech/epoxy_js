import {EpoxyGlobalState} from './global-state';

/**
 * Assigns unique mutation indexes using a simple counter.
 */
let GlobalMutationIndexer = 0;

export abstract class Mutation<T> {
    public readonly id: number;
    public readonly createdBy: string | Symbol;
    public readonly fromBatch: string | null;

    constructor(
        public key: PropertyKey,
    ) {
        this.id = GlobalMutationIndexer++;
        this.createdBy = EpoxyGlobalState.currentActor;
        this.fromBatch = EpoxyGlobalState.batchName;
    }

    abstract copy(): Mutation<T>;
}

export class ValueMutation<T> extends Mutation<T> {
    constructor(
        public oldValue: T,
        public newValue: T,
    ) {
        super(null);
    }

    copy() {
        return new ValueMutation(this.oldValue, this.newValue);
    }
}

export class PropertyMutation<T> extends Mutation<T> {
    constructor(
        key: PropertyKey,
        public oldValue: T,
        public newValue: T,
    ) {
        super(key);
    }

    copy() {
        return new PropertyMutation(this.key, this.oldValue, this.newValue);
    }
}

export class SubpropertyMutation<T> extends Mutation<T> {
    constructor(
        key: PropertyKey,
        public mutation: Mutation<any>,
    ) {
        super(key);
    }

    copy() {
        return new SubpropertyMutation(this.key, this.mutation.copy());
    }
}

export class ArraySpliceMutation<T> extends Mutation<T> {
    constructor(
        key: number,
        public deleted: Array<T>,
        public inserted: Array<T>,
    ) {
        super(key);
    }

    copy() {
        return new ArraySpliceMutation(this.key as number, this.deleted, this.inserted);
    }
}


// MUTATION HELPER FUNCTIONS

/**
 * Returns a mutation that cancels out the given mutation, essentially undoing it.
 */
export function invertMutation<T>(mutation: Mutation<T>): Mutation<T> {
    if (mutation instanceof PropertyMutation) {
        return new PropertyMutation<T>(mutation.key, mutation.newValue, mutation.oldValue);
    } else if (mutation instanceof ValueMutation) {
        return new ValueMutation<T>(mutation.newValue, mutation.oldValue);
    } else if (mutation instanceof ArraySpliceMutation) {
        return new ArraySpliceMutation<T>(mutation.key as number, mutation.inserted, mutation.deleted);
    } else if (mutation instanceof SubpropertyMutation) {
        return new SubpropertyMutation(mutation.key, invertMutation(mutation.mutation));
    }
}