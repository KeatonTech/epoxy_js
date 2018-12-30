import { makeListenable, ReadonlyException } from '../../epoxy'
import { toObject } from '../../operators';
import { expect } from 'chai';
import 'mocha';

describe('Listenable Objects from Arrays', () => {
    it('returns a readonly object', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const listenableObject = toObject(baseArray, (value) => value);
        expect(() => listenableObject[0] = 1).throws(ReadonlyException);
    });

    it('returns an object matching the input array', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const listenableObject = toObject(baseArray, (value) => value);
        expect(listenableObject).eqls({
            1:1, 2:2, 3:3, 4:4, 5:5, 6:6
        });
    });

    it('adds values when rows are added to the array', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const listenableObject = toObject(baseArray, (value) => value);
        baseArray.push(7);
        expect(listenableObject).eqls({
            1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7
        });
    });

    it('removes values when rows are removed to the array', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const listenableObject = toObject(baseArray, (value) => value);
        baseArray.shift();
        expect(listenableObject).eqls({
            2:2, 3:3, 4:4, 5:5, 6:6
        });
    });

    it('updates values when rows are changed in the array', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const listenableObject = toObject(baseArray, (value) => value);
        baseArray[0] = 10,
        expect(listenableObject).eqls({
            10:10, 2:2, 3:3, 4:4, 5:5, 6:6
        });
    });

    it('throws an error when object keys would overlap initially', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6, 1]);
        expect(() => toObject(baseArray, (value) => value)).throws(Error);
    });
});
