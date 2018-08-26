import { Mutation, PropertyMutation, SubpropertyMutation, ArraySpliceMutation, ValueMutation, makeListenable, ListenableCollection, IListenableArray } from '../epoxy';
import { MutationSequence } from '../src/mutation-sequence';
import { expect } from 'chai';
import 'mocha';

describe('Mutation sequence optimization', () => {
    describe('for objects', () => {
        let collection: ListenableCollection;
        let sequence: MutationSequence<any>;

        beforeEach(() => {
            collection = makeListenable({});
            sequence = MutationSequence.create(collection);
        });

        it('should track all property changes', () => {
            sequence.pushMutation(new PropertyMutation('a', 1, 2));
            sequence.pushMutation(new PropertyMutation('b', 2, 1));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new PropertyMutation('a', 1, 2),
                new PropertyMutation('b', 2, 1)
            ]);
        });

        it('should collapse duplicate property changes', () => {
            sequence.pushMutation(new PropertyMutation('a', 1, 2));
            sequence.pushMutation(new PropertyMutation('b', 2, 1));
            sequence.pushMutation(new PropertyMutation('a', 2, 3));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new PropertyMutation('a', 1, 3),
                new PropertyMutation('b', 2, 1)
            ]);
        });

        it('should collect multiple subproperty changes', () => {
            const subProp1 = new PropertyMutation('b', 1, 2);
            const subProp2 = new PropertyMutation('b', 1, 2);
            sequence.pushMutation(new SubpropertyMutation('a', subProp1));
            sequence.pushMutation(new SubpropertyMutation('a', subProp2));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new SubpropertyMutation('a', subProp1),
                new SubpropertyMutation('a', subProp2)
            ]);
        });

        it('should overwrite subproperty changes with property changes', () => {
            const subProp1 = new PropertyMutation('b', 1, 2);
            const subProp2 = new PropertyMutation('b', 1, 2);
            sequence.pushMutation(new SubpropertyMutation('a', subProp1));
            sequence.pushMutation(new SubpropertyMutation('a', subProp2));
            sequence.pushMutation(new PropertyMutation('a', 1, 2));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new PropertyMutation('a', 1, 2),
            ]);
        });

        it('should overwrite property changes with value changes', () => {
            const subProp1 = new PropertyMutation('b', 1, 2);
            const subProp2 = new PropertyMutation('b', 1, 2);
            sequence.pushMutation(new SubpropertyMutation('a', subProp1));
            sequence.pushMutation(new SubpropertyMutation('a', subProp2));
            sequence.pushMutation(new PropertyMutation('a', 1, 2));
            sequence.pushMutation(new ValueMutation({}, {}));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ValueMutation({}, {}),
            ]);
        });
    });

    describe('for arrays', () => {
        let collection: IListenableArray<number>;
        let sequence: MutationSequence<any>;

        beforeEach(() => {
            collection = makeListenable([]);
            sequence = MutationSequence.create(collection);
        });

        it('should track all property changes', () => {
            sequence.pushMutation(new PropertyMutation(0, 1, 2));
            sequence.pushMutation(new PropertyMutation(1, 2, 1));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new PropertyMutation(0, 1, 2),
                new PropertyMutation(1, 2, 1)
            ]);
        });

        it('keeps property change mutations tact after a splice operation', () => {
            sequence.pushMutation(new PropertyMutation(0, 1, 2));
            sequence.pushMutation(new PropertyMutation(1, 2, 1));
            sequence.pushMutation(new ArraySpliceMutation(0, [], [0]));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [], [0]),
                new PropertyMutation(1, 1, 2),
                new PropertyMutation(2, 2, 1)
            ]);
        });

        it('keeps property change mutations tact between a splice operation', () => {
            sequence.pushMutation(new PropertyMutation(0, 1, 2));
            sequence.pushMutation(new ArraySpliceMutation(0, [], [0]));
            sequence.pushMutation(new PropertyMutation(2, 2, 1));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [], [0]),
                new PropertyMutation(1, 1, 2),
                new PropertyMutation(2, 2, 1)
            ]);
        });

        it('combines property change operations that land on the same index', () => {
            sequence.pushMutation(new PropertyMutation(0, 1, 2));
            sequence.pushMutation(new ArraySpliceMutation(0, [], [0]));
            sequence.pushMutation(new PropertyMutation(1, 2, 3));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [], [0]),
                new PropertyMutation(1, 1, 3),
            ]);
        });

        it('combines array splice operations and property mutations', () => {
            sequence.pushMutation(new PropertyMutation(0, 1, 2));
            sequence.pushMutation(new ArraySpliceMutation(0, [], [0]));
            sequence.pushMutation(new PropertyMutation(0, 0, 3));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [], [3]),
                new PropertyMutation(1, 1, 2),
            ]);
        });

        it('combines adjacent insertions', () => {
            sequence.pushMutation(new ArraySpliceMutation(1, [], [0]));
            sequence.pushMutation(new ArraySpliceMutation(1, [], [1]));
            sequence.pushMutation(new ArraySpliceMutation(1, [], [2]));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(1, [], [2, 1, 0]),
            ]);
        });

        it('combines adjacent backward insertions', () => {
            sequence.pushMutation(new ArraySpliceMutation(0, [], [0]));
            sequence.pushMutation(new ArraySpliceMutation(1, [], [1]));
            sequence.pushMutation(new ArraySpliceMutation(2, [], [2]));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [], [0, 1, 2]),
            ]);
        });

        it('does not combine non-adjacent insertions', () => {
            sequence.pushMutation(new ArraySpliceMutation(2, [], [0]));
            sequence.pushMutation(new ArraySpliceMutation(1, [], [1]));
            sequence.pushMutation(new ArraySpliceMutation(0, [], [2]));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(4, [], [0]),
                new ArraySpliceMutation(2, [], [1]),
                new ArraySpliceMutation(0, [], [2]),
            ]);
        });

        it('combines adjacent deletions', () => {
            sequence.pushMutation(new ArraySpliceMutation(1, [0], []));
            sequence.pushMutation(new ArraySpliceMutation(1, [1], []));
            sequence.pushMutation(new ArraySpliceMutation(1, [2], []));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(1, [0, 1, 2], []),
            ]);
        });

        it('ignores elements that are both added and removed', () => {
            sequence.pushMutation(new ArraySpliceMutation(2, [], [4]));
            sequence.pushMutation(new ArraySpliceMutation(0, [1], []));
            sequence.pushMutation(new ArraySpliceMutation(1, [4], []));
            expectContainsMutations(sequence.getOptimizedSequence(), [
                new ArraySpliceMutation(0, [1], []),
            ]);
        });
    });
});

/**
 * Tests to make sure list A contains every mutation in list B
 */
function expectContainsMutations(a: Mutation<any>[], b: Mutation<any>[]) {
    for (const mutationA of a) {
        let foundMatch = false;
        for (const mutationB of b) {
            let allPropertiesMatch = true;
            for (const propertyA in (mutationA as any)) {
                if (!mutationA.hasOwnProperty(propertyA)) continue;
                if (propertyA == 'id') continue;
                try {
                    expect(mutationA[propertyA]).eqls(mutationB[propertyA]);
                } catch (e) {
                    allPropertiesMatch = false;
                    break;
                }
            }
            if (allPropertiesMatch) {
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) {
            throw new Error('Did not find matching mutation for ' + JSON.stringify(mutationA));
        }
    }
}

