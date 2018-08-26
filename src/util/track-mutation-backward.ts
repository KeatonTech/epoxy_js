import { invertMutation, Mutation, PropertyMutation, SubpropertyMutation, ValueMutation, ArraySpliceMutation } from '../../epoxy';

/**
 * Takes a mutation applied to a collection at one specific moment in time and
 * alters it such that it can apply to the same collection had one or more
 * earlier mutations not occured. For example, if an item is appended to index
 * 3 in an Array but an earlier mutation that added 2 items to the beginning of
 * that Array is removed, the new index of this mutation will be 1. 
 */
export function trackMutationBackward<T extends Mutation<any>>(
    mutation: T,
    throughChanges: Array<Mutation<any>>,
): T | null {
    if (mutation instanceof ValueMutation) {
        return mutation;
    }
    return throughChanges.reverse().reduce(
        (currentMutation, changeMutation) => {
            if (!currentMutation) return currentMutation;
            return trackMutation(currentMutation, changeMutation);
        },
        mutation) as T;
}

/**
 * Updates a mutation to account for the change made by another mutation.
 * Returns the original mutation is no change is necessary.
 * Returns null if the other mutation obsoletes or invalidates the input mutation.
 */
function trackMutation<T extends Mutation<any>>(
    mutation: T,
    throughChange: Mutation<any>,
): Mutation<any> | null {
    if (mutation instanceof ValueMutation) {
        return mutation;
    } else if (mutation instanceof PropertyMutation || mutation instanceof SubpropertyMutation) {
        return trackPropertyMutation(mutation, throughChange);
    } else if (mutation instanceof ArraySpliceMutation) {
        return trackArraySpliceMutation(mutation, throughChange);
    } else {
        throw new Error('Input mutation was not a valid mutation object.');
    }
}

/**
 * Implementation of the trackMutation function for property mutations.
 */
function trackPropertyMutation(
    mutation: PropertyMutation<any> | SubpropertyMutation<any>,
    throughChange: Mutation<any>,
    allowLocalDestruction = false,
): SubpropertyMutation<any> | PropertyMutation<any> | null {
    if (throughChange instanceof ValueMutation) {
        return null;
    } else if (throughChange instanceof ArraySpliceMutation) {
        return trackThroughArraySplice(mutation, throughChange);
    } else {
        return mutation;
    }
}

/**
 * Implementation of the trackMutation function for array splice mutations.
 */
function trackArraySpliceMutation(
    mutation: ArraySpliceMutation<any>,
    throughChange: Mutation<any>
): ArraySpliceMutation<any> | null {
    if (throughChange instanceof ValueMutation) {
        return null;
    }
    if (throughChange instanceof ArraySpliceMutation &&
        (throughChange.key as number) <= (mutation.key as number)
    ) { 
        // TODO(kbrandt): Figure out the logic for updating the insertion and deletion
        //   arrays to remove individual items that should no longer be included.
        this.trackThroughArraySplice(mutation, throughChange);
    }
    return mutation;
}

/**
 * Update a property keyed Mutation through an ArraySpliceMutation.
 */
function trackThroughArraySplice<T extends Mutation<any>>(
    mutation: T,
    arraySplice: ArraySpliceMutation<any>
): T | null {
    if (typeof mutation.key === 'number' && (arraySplice.key as number) <= mutation.key) {
        if (mutation.key < (arraySplice.key as number) + arraySplice.inserted.length) {
            // Item was created by the removed mutation.
            return null;
        }
        const shifted = mutation.copy();
        (shifted.key as number) -= arraySplice.inserted.length;
        (shifted.key as number) += arraySplice.deleted.length;
        return shifted as T;
    } else {
        return mutation;
    }
}