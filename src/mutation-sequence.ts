import {Mutation, ArraySpliceMutation, PropertyMutation, SubpropertyMutation, ValueMutation} from './mutations';
import {ListenableCollection, ListenableSignifier} from './types';
import {SymbolIndexMap} from './mutation-sequence-structures';

/**
 * The Mutation Sequence class is capable of storing a sequence of mutations, oprytimizing it
 * into a smaller set of mutations, removing unnecessary mutations, and modifying the list while
 * keeping subsequent mutations pointing to the correct indices.
 * 
 * Note that this class only represents mutations from a single data source. 
 */
export abstract class MutationSequence<T> {
    constructor(
        protected collection: ListenableCollection,
    ) {}

    /**
     * Creates a new MutationSequence for an Epoxy data structure.
     */
    static create(collection: ListenableCollection) {
        if (!collection[ListenableSignifier]) {
            throw new Error('Collection was not listanble.');
        }
        if (collection instanceof Array) {
            return new ArrayMutationSequence(collection);
        } else if (typeof collection === 'object') {
            return new ObjectMutationSequence<any>(collection);
        } else {
            throw new Error('Collection was not a valid object.');
        }
    }

    /**
     * Adds a new mutation to the end of the sequence.
     */
    abstract pushMutation(mutation: Mutation<T>);

    /**
     * Returns an optimized version of the sequence containing (usually) fewer mutations.
     */
    abstract getOptimizedSequence(): Mutation<T>[];
}

/**
 * MutationSequence implementation that works for Objects. This version cannot handle
 * ArraySpliceMutations.
 */
export class ObjectMutationSequence<T extends object> extends MutationSequence<T> {
    protected propertyMap: Map<PropertyKey, Mutation<T>[]> = new Map();
    protected originalValues: Map<PropertyKey, T> = new Map();

    // @override
    pushMutation(mutation: Mutation<any>) {

        // ValueMutations overwrite every mutation.
        if (mutation instanceof ValueMutation) {
            this.propertyMap = new Map();
            return;
        }

        // PropertyMutations always overwrite previous mutations to the property,
        // including subproperties.
        if (mutation instanceof PropertyMutation) {
            if (this.originalValues.has(mutation.key)) {
                const originalValueMutation = mutation.copy();
                originalValueMutation.oldValue = this.originalValues.get(mutation.key);
                this.propertyMap.set(mutation.key, [originalValueMutation])
            } else {
                this.originalValues.set(mutation.key, mutation.oldValue);
                this.propertyMap.set(mutation.key, [mutation]);
            }
            return;

        } else if (mutation instanceof SubpropertyMutation) {
            if (!this.propertyMap.has(mutation.key)) {
                this.propertyMap.set(mutation.key, [mutation]);
            } else if (this.propertyMap.get(mutation.key).length == 1 &&
                       this.propertyMap.get(mutation.key)[0] instanceof PropertyMutation) {
                (this.propertyMap.get(mutation.key)[0] as PropertyMutation<any>).newValue =
                    this.collection[mutation.key].staticCopy();
            } else {
                this.propertyMap.get(mutation.key).push(mutation);
            }
            return;
        }

        // Fallback case.
        throw new Error(`Unknown or invalid mutation type: ${mutation.constructor.name}`);
    }

    // @override
    getOptimizedSequence() {
        let sequence = [];
        for (const list of this.propertyMap.values()) {
            sequence.push.apply(sequence, list);
        }
        return sequence;
    }
}

/**
 * MutationSequence that works for Arrays by tracking changed indices even as they are shifted around by
 * insertion and deletion operations.
 */
export class ArrayMutationSequence<T extends object> extends ObjectMutationSequence<T> {
    private symbolMap = new SymbolIndexMap();
    private inserted = new Map<symbol, T>();
    private deleted = new Map<number, T>();

    // @override
    pushMutation(mutation: Mutation<any>) {

        // ValueMutations overwrite every mutation.
        if (mutation instanceof ValueMutation) {
            this.symbolMap = new SymbolIndexMap();
            this.inserted = new Map<symbol, T>();
            this.deleted = new Map<number, T>();
            return super.pushMutation(mutation);
        }

        // Property mutations are handled as they would be for objects, except they use symbols
        // instead of indices so as not to be affected by insertion / deletion.
        if (mutation instanceof PropertyMutation || mutation instanceof SubpropertyMutation) {
            return this.pushPropertyChangeMutation(mutation);
        }

        // Handle array splices by handling deletions, then shifting the index map and handling
        // insertions. Deleted items are not removed from the index map.
        if (mutation instanceof ArraySpliceMutation) {
            return this.pushSpliceMutation(mutation);
        }

        // Fallback case.
        throw new Error(`Unknown or invalid mutation type: ${mutation.constructor.name}`);
    }

    /**
     * Handles a property change mutation being added to the sequence.
     */
    private pushPropertyChangeMutation(mutation: PropertyMutation<any> | SubpropertyMutation<any>) {
        const indexSymbol = this.symbolMap.getSymbolForIndex(mutation.key as number);

        // If this property was added in the current batch, simplify it from two operations
        // (add + edit) to just one operation (add) where possible.
        if (this.inserted.has(indexSymbol)) {
            if (mutation instanceof PropertyMutation) {
                this.inserted.set(indexSymbol, mutation.newValue);
                return;
            } else if (this.inserted[indexSymbol][ListenableSignifier]) {
                this.inserted[indexSymbol].applyMutation(mutation.mutation);
                return;
            }
        }

        const symbolicIndexMutation = mutation.copy();
        symbolicIndexMutation.key = indexSymbol;
        return super.pushMutation(symbolicIndexMutation);
    }

    /**
     * Handles an array splice mutation being added to the sequence.
     */
    private pushSpliceMutation(mutation: ArraySpliceMutation<any>) {
        const startIndex = mutation.key as number;

        // Handle deleted items.
        for (let i = 0; i < mutation.deleted.length; i++) {
            const deletionIndex = startIndex + i;
            const deletedSymbol = this.symbolMap.getSymbolForIndex(deletionIndex);
            const originalIndex = this.symbolMap.getOriginalIndexAt(deletionIndex);

            this.propertyMap.delete(deletedSymbol);
            this.symbolMap.shift(startIndex + i, -1);

            // If this item was also inserted during this mutation sequence, just pretend
            // the whole thing never happened (instead of adding then removing it).
            if (this.inserted.has(deletedSymbol)) {
                this.inserted.delete(deletedSymbol);
            } else {
                this.deleted.set(originalIndex, mutation.deleted[i]);
            }
        };

        // Handle inserted items.
        this.symbolMap.shift(startIndex, mutation.inserted.length);
        for (let i = 0; i < mutation.inserted.length; i++) {
            const value = mutation.inserted[i];
            this.inserted.set(this.symbolMap.getSymbolForIndex(startIndex + i), value);
        }
    }

    // @override
    getOptimizedSequence() {
        const symbolToIndex = this.symbolMap.getLookupMap();
        
        const sequence = [];
        sequence.push.apply(sequence, this.createDeletionMutations());
        sequence.push.apply(sequence, this.createInsertionMutations(symbolToIndex));
        sequence.push.apply(sequence, super.getOptimizedSequence().map((mutation) => {
            if (typeof mutation.key === 'symbol') {
                const indexMutation = mutation.copy();
                indexMutation.key = symbolToIndex.get(indexMutation.key);
                return indexMutation;
            } else {
                return mutation;
            }
        }));
        return sequence;
    }

    /**
     * Takes a sequence of indices and groups them into monotonically increasing sequences.
     * Expects the input list to be sorted!
     */
    private findMonotonicSequences(indices: number[]): number[][] {
        if (indices.length < 1) return [];

        const ret = [];
        let sequence = [indices[0]];
        for (let i = 1; i < indices.length; i++) {
            if (indices[i] != sequence[sequence.length - 1] + 1) {
                ret.push(sequence);
                sequence = [indices[i]];
            } else {
                sequence.push(indices[i]);
            }
        }
        ret.push(sequence);
        return ret;
    }

    /**
     * Uses findMonotonicSequences to combine the operations from this.deleted into a
     * minimal set of deletion splice mutations.
     */
    private createDeletionMutations() {
        return this.findMonotonicSequences(Array.from(this.deleted.keys()).sort())
            .reverse()
            .map((sequence) => new ArraySpliceMutation(
                sequence[0],
                sequence.map((index) => this.deleted.get(index)),
                []
            ))
    }

    /**
     * Uses findMonotonicSequences to combine the operations from this.inserted into a
     * minimal set of insertion splice mutations.
     */
    private createInsertionMutations(symbolToIndex: Map<Symbol, number>) {
        return this.findMonotonicSequences(
                Array.from(this.inserted.keys()).map((symbol) => symbolToIndex.get(symbol)).sort()
            )
            .map((sequence) => new ArraySpliceMutation(
                sequence[0],
                [],
                sequence.map((i) => this.inserted.get(this.symbolMap.getSymbolForIndex(i)))
            ))
    }
}