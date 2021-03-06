import {EpoxyGlobalState} from './global-state';

function makeMutationId() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, (c) => Math.floor(Math.random() * 36).toString(36));
}

export abstract class Mutation<T> {
    public id: string;
    public createdBy: string | Symbol;

    /** Static wrapper function that is overridden in debug mode. */
    static initialize?: (instance: Mutation<any>) => void;

    constructor(
        public key: PropertyKey,
    ) {
        this.id = makeMutationId();
        this.createdBy = EpoxyGlobalState.currentActor;
        if (Mutation.initialize) Mutation.initialize(this);
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
    let inverted: Mutation<T>;
    if (mutation instanceof PropertyMutation) {
        inverted = new PropertyMutation<T>(mutation.key, mutation.newValue, mutation.oldValue);
    } else if (mutation instanceof ValueMutation) {
        inverted = new ValueMutation<T>(mutation.newValue, mutation.oldValue);
    } else if (mutation instanceof ArraySpliceMutation) {
        inverted = new ArraySpliceMutation<T>(mutation.key as number, mutation.inserted, mutation.deleted);
    } else if (mutation instanceof SubpropertyMutation) {
        inverted = new SubpropertyMutation(mutation.key, invertMutation(mutation.mutation));
    } else {
        throw new Error('Could not invert unknown mutation type');
    }
    inverted.createdBy = mutation.createdBy;
    return inverted;
}