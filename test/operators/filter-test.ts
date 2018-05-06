import { makeListenable, Mutation, ArraySpliceMutation, PropertyMutation, ReadonlyException } from '../../epoxy'
import { filter } from '../../operators';
import { expect } from 'chai';
// import mocha

describe('Filtered Listenable Collections', () => {
    it('returns a readonly collection', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        expect(() => filteredArray.push(4)).throws(ReadonlyException);
    });

    it('returns a filtered collection', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        expect(filteredArray).eqls([2, 4, 6]);
    });

    it('does not append items that fail the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.push(7);
        expect(filteredArray).eqls([2, 4, 6]);
    });

    it('appends items that pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.push(7);
        baseArray.push(8);
        expect(filteredArray).eqls([2, 4, 6, 8]);
    });

    it('does not splice items that fail the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 0, 7);
        expect(filteredArray).eqls([2, 4, 6]);
    });

    it('splices items that pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 0, 10);
        baseArray.splice(2, 0, 11);
        baseArray.splice(2, 0, 12);
        expect(filteredArray).eqls([2, 12, 10, 4, 6]);
    });

    it('deletes items that pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(3, 1);
        expect(filteredArray).eqls([2, 6]);
        baseArray.splice(1, 1);
        expect(filteredArray).eqls([6]);
        baseArray.splice(3, 1);
        expect(filteredArray).eqls([]);
    });

    it('does not delete items that do not pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 1);
        expect(filteredArray).eqls([2, 4, 6]);
        baseArray.splice(0, 1);
        expect(filteredArray).eqls([2, 4, 6]);
        baseArray.splice(2, 1);
        expect(filteredArray).eqls([2, 4, 6]);
    });

    it('updates items so they still pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray[1] = 10;
        expect(filteredArray).eqls([10, 4, 6]);
    });

    it('updates items so they no longer pass the filter', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray[1] = 3;
        expect(filteredArray).eqls([4, 6]);
    });

    it('does nothing when a filtered item is changed but still filtered', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray[0] = -1;
        expect(filteredArray).eqls([2, 4, 6]);
    });

    it('adds an item when a filtered item is changed to no longer be filtered', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = filter(baseArray, (val) => val % 2 == 0);
        baseArray[0] = 0;
        expect(filteredArray).eqls([0, 2, 4, 6]);
        baseArray[2] = 30;
        expect(filteredArray).eqls([0, 2, 30, 4, 6]);
    });
});