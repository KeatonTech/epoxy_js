import { Mutation, PropertyMutation, SubpropertyMutation, ValueMutation, ArraySpliceMutation } from '../../epoxy';
import { trackMutationForward } from '../../src/util/track-mutation-forward';
import { expect } from 'chai';
// import mocha

describe('Util / Track Mutation Forward', () => {
    it('should return the original mutation unchanged when it is not affected', () => {
        const original = new PropertyMutation('a', 0, 1);
        const tracked = trackMutationForward(
            original,
            [
                new PropertyMutation('b', 2, 3),
                new SubpropertyMutation('c', new ValueMutation([1], [2]))
            ]
        );
        expect(tracked).eqls(original);
    });

    it('should return null when the original mutation is overwritten', () => {
        const original = new PropertyMutation('a', 0, 1);
        const tracked = trackMutationForward(
            original,
            [
                new PropertyMutation('a', 0, 2),
            ]
        );
        expect(tracked).to.be.null;
    });

    describe('allowLocalDestruction disabled', () => {
        it('should return null when the original mutation may overwrite local changes', () => {
            const original = new PropertyMutation('a', {b: 3}, {b: 4});
            const tracked = trackMutationForward(
                original,
                [
                    new SubpropertyMutation('a', new PropertyMutation('b', 0, 2)),
                ]
            );
            expect(tracked).to.be.null;
        });

        it('should disallow value mutations', () => {
            const original = new ValueMutation({a: 3}, {a: 4});
            const tracked = trackMutationForward(
                original,
                [
                    new PropertyMutation('a', 0, 2),
                ]);
            expect(tracked).to.be.null;
        });
    });

    describe('allowLocalDestruction enabled', () => {
        it('should allow local changes to be overwritten', () => {
            const original = new PropertyMutation('a', {b: 3}, {b: 4});
            const tracked = trackMutationForward(
                original,
                [
                    new SubpropertyMutation('a', new PropertyMutation('b', 0, 2)),
                ],
                true /** allowLocalDestruction */);
            expect(tracked).eqls(original);
        });

        it('should allow value mutations', () => {
            const original = new ValueMutation({a: 3}, {a: 4});
            const tracked = trackMutationForward(
                original,
                [
                    new PropertyMutation('a', 0, 2),
                ],
                true /** allowLocalDestruction */);
            expect(tracked).eqls(original);
        });
    });

    it('should update indices to account for value insertion', () => {
        const original = new PropertyMutation(3, 0, 1);
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(3, [], [4, 5])
            ]
        );
        expect(tracked).not.eqls(original);
        expect(tracked.key).eqls(5);
    });

    it('should update indices to account for value deletion', () => {
        const original = new SubpropertyMutation(3, new ValueMutation([0], [1]));
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(1, [4, 5], [])
            ]
        );
        expect(tracked).not.eqls(original);
        expect(tracked.key).eqls(1);
    });

    it('should ignore mutations whose values were deleted by an array splice', () => {
        const original = new SubpropertyMutation(3, new ValueMutation([0], [1]));
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(2, [4, 5], [])
            ]
        );
        expect(tracked).to.be.null;
    });

    it('should ignore array splices after the affected index', () => {
        const original = new PropertyMutation(3, 0, 1);
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(4, [], [4, 5])
            ]
        );
        expect(tracked).eqls(original);
    });

    it('should work with subproperty mutations with the same property', () => {
        const original = new SubpropertyMutation('a', new PropertyMutation(3, 0, 1));
        const tracked = trackMutationForward(
            original,
            [
                new SubpropertyMutation('a', new ArraySpliceMutation(0, [], [1]))
            ]
        );
        expect(tracked.mutation.key).eqls(4);
    });

    it('should ignore subproperty mutations with a different property', () => {
        const original = new SubpropertyMutation('a', new PropertyMutation(3, 0, 1));
        const tracked = trackMutationForward(
            original,
            [
                new SubpropertyMutation('b', new ArraySpliceMutation(0, [], [1]))
            ]
        );
        expect(tracked).eqls(original);
    });

    it('should let property mutations overwrite subproperty mutations', () => {
        const original = new SubpropertyMutation('a', new PropertyMutation(3, 0, 1));
        const tracked = trackMutationForward(
            original,
            [
                new PropertyMutation('a', 0, 1)
            ]
        );
        expect(tracked).to.be.null;
    });

    it('should shift the start index of ArraySpliceMutations by insertions', () => {
        const original = new ArraySpliceMutation(4, [], [1, 2, 3]);
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(4, [], [0])
            ]
        );
        expect(tracked.key).eqls(5);
    });

    it('should shift the start index of ArraySpliceMutations by deletions', () => {
        const original = new ArraySpliceMutation(4, [], [1, 2, 3]);
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(3, [0], [])
            ]
        );
        expect(tracked.key).eqls(3);
    });
    
    /* it('should remove duplicate deletions', () => {
        const original = new ArraySpliceMutation(4, [1, 2, 3], []);
        const tracked = trackMutationForward(
            original,
            [
                new ArraySpliceMutation(3, [0, 1, 2], [])
            ]
        );
        expect(tracked.key).eqls(3);
        expect(tracked.deleted).eqls([3]);
        expect(tracked.inserted.length).eqls(0);
    }); */
});