import { Mutation, PropertyMutation, SubpropertyMutation, ValueMutation, ArraySpliceMutation } from '../../epoxy';

/**
 * Takes a mutation applied to a collection at one specific moment in time and
 * alters it such that it can apply to the same collection at a later moment
 * in time. For example, if a mutation modifies an array at index 3 but before
 * that mutation is processed the element at index 1 is deleted, this function
 * will update the mutation to affect index 2 instead.
 * 
 * When the allowLocalDestruction is false, ValueMutations and some PropertyMutations
 * will return null because there is no way to reconcile them without potentially
 * overwriting some of the local state. 
 */
export function trackMutationForward<T extends Mutation<any>>(
    mutation: T,
    throughChanges: Array<Mutation<any>>,
    allowLocalDestruction = false,
): T | null {
    return throughChanges.reduce(
        (currentMutation, changeMutation) => {
            if (!currentMutation) return currentMutation;
            return trackMutation(currentMutation, changeMutation, allowLocalDestruction);
        },
        mutation) as T;
}

/**
 * Updates a mutation to account for the change made by another mutation.
 * Returns the original mutation is no change is necessary.
 * Returns null if the other mutation obsoletes or invalidates the input mutation.
 */
export function trackMutation<T extends Mutation<any>>(
    mutation: T,
    throughChange: Mutation<any>,
    allowLocalDestruction = false,
): Mutation<any> | null {
    if (mutation instanceof ValueMutation) {
        if (!allowLocalDestruction) {
            return null;
        }
        return mutation;

    } else if (mutation instanceof PropertyMutation) {
        return trackPropertyMutation(mutation, throughChange, allowLocalDestruction);
    } else if (mutation instanceof ArraySpliceMutation) {
        return trackArraySpliceMutation(mutation, throughChange);
    } else if (mutation instanceof SubpropertyMutation) {
        return trackSubpropertyMutation(mutation, throughChange);
    } else {
        throw new Error('Input mutation was not a valid mutation object.');
    }
}

/**
 * Implementation of the trackMutation function for property mutations.
 */
function trackPropertyMutation(
    mutation: PropertyMutation<any>,
    throughChange: Mutation<any>,
    allowLocalDestruction = false,
): PropertyMutation<any> | null {
    if (throughChange instanceof ValueMutation) {
        return null;
    } else if (throughChange instanceof PropertyMutation && throughChange.key === mutation.key) {
        return null;
    } else if (!allowLocalDestruction && 
        throughChange instanceof SubpropertyMutation && throughChange.key === mutation.key) {
        return null;
    } else if (throughChange instanceof ArraySpliceMutation) {
        return trackThroughArraySplice(mutation, throughChange);
    } else {
        return mutation;
    }
}

/**
 * Implementation of the trackMutation function for subproperty mutations.
 */
function trackSubpropertyMutation(
    mutation: SubpropertyMutation<any>,
    throughChange: Mutation<any>
): SubpropertyMutation<any> | null {
    if (throughChange instanceof ValueMutation) {
        return null;
    } else  if (throughChange instanceof PropertyMutation && throughChange.key === mutation.key) {
        return null;
    } else if (throughChange instanceof SubpropertyMutation && throughChange.key === mutation.key) {
        const updated = mutation.copy();
        updated.mutation = trackMutation(mutation.mutation, throughChange.mutation);
        return updated;
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
        const updated = mutation.copy();
        const previousMutationOffs = (throughChange.key as number) - (mutation.key as number);
        if (previousMutationOffs <= throughChange.deleted.length && mutation.deleted.length > 0) {
            const shiftDeletion = throughChange.deleted.length - previousMutationOffs;
            updated.deleted = mutation.deleted.slice(previousMutationOffs);
            updated.key = throughChange.key;
        } else {
            (updated.key as number) -= throughChange.deleted.length;
        }
        (updated.key as number) += throughChange.inserted.length;
        return updated;
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
        if (mutation.key < (arraySplice.key as number) + arraySplice.deleted.length) {
            // Item was deleted.
            return null;
        }
        const shifted = mutation.copy();
        (shifted.key as number) += arraySplice.inserted.length;
        (shifted.key as number) -= arraySplice.deleted.length;
        return shifted as T;
    } else {
        return mutation;
    }
}