"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Mutation {
    constructor(key) {
        this.key = key;
    }
}
exports.Mutation = Mutation;
class ValueMutation extends Mutation {
    constructor(oldValue, newValue) {
        super(null);
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
exports.ValueMutation = ValueMutation;
class PropertyMutation extends Mutation {
    constructor(key, oldValue, newValue) {
        super(key);
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
exports.PropertyMutation = PropertyMutation;
class SubpropertyMutation extends Mutation {
    constructor(key, mutation) {
        super(key);
        this.mutation = mutation;
    }
}
exports.SubpropertyMutation = SubpropertyMutation;
class ArraySpliceMutation extends Mutation {
    constructor(key, deleted, inserted) {
        super(key);
        this.deleted = deleted;
        this.inserted = inserted;
    }
}
exports.ArraySpliceMutation = ArraySpliceMutation;
// MUTATION HELPER FUNCTIONS
/**
 * Returns a mutation that cancels out the given mutation, essentially undoing it.
 */
function invertMutation(mutation) {
    if (mutation instanceof PropertyMutation) {
        return new PropertyMutation(mutation.key, mutation.newValue, mutation.oldValue);
    }
    else if (mutation instanceof ValueMutation) {
        return new ValueMutation(mutation.newValue, mutation.oldValue);
    }
    else if (mutation instanceof ArraySpliceMutation) {
        return new ArraySpliceMutation(mutation.key, mutation.inserted, mutation.deleted);
    }
    else if (mutation instanceof SubpropertyMutation) {
        return new SubpropertyMutation(mutation.key, invertMutation(mutation.mutation));
    }
}
exports.invertMutation = invertMutation;
