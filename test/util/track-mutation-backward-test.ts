import { Mutation, PropertyMutation, SubpropertyMutation, ValueMutation, ArraySpliceMutation } from '../../epoxy';
import { trackMutationBackward } from '../../src/util/track-mutation-backward';
import { expect } from 'chai';
// import mocha

describe('Util / Track Mutation Backward', () => {
    it('should return the original mutation unchanged when it is not affected', () => {
        const original = new PropertyMutation('a', 0, 1);
        const tracked = trackMutationBackward(
            original,
            [
                new PropertyMutation('b', 2, 3),
                new SubpropertyMutation('c', new ValueMutation([1], [2]))
            ]
        );
        expect(tracked).eqls(original);
    });

    it('should return null when the original mutation depended on a removed value mutation', () => {
        const original = new PropertyMutation('a', 0, 1);
        const tracked = trackMutationBackward(
            original,
            [
                new ValueMutation([], []),
            ]
        );
        expect(tracked).to.be.null;
    });

    it('should return null when the original mutation depended on a removed insertion', () => {
        const original = new PropertyMutation(3, 0, 1);
        const tracked = trackMutationBackward(
            original,
            [
                new ArraySpliceMutation(3, [], [4, 5])
            ]
        );
        expect(tracked).to.be.null;
    });

    it('should update indices to account for removed array insertions', () => {
        const original = new PropertyMutation(3, 0, 1);
        const tracked = trackMutationBackward(
            original,
            [
                new ArraySpliceMutation(0, [], [4, 5])
            ]
        );
        expect(tracked).not.eqls(original);
        expect(tracked.key).eqls(1);
    });

    it('should update indices to account for removed array deletions', () => {
        const original = new PropertyMutation(3, 0, 1);
        const tracked = trackMutationBackward(
            original,
            [
                new ArraySpliceMutation(0, [4, 5], [])
            ]
        );
        expect(tracked).not.eqls(original);
        expect(tracked.key).eqls(5);
    });
});