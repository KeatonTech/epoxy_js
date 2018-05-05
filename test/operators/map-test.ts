import { makeListenable, Mutation, ArraySpliceMutation, PropertyMutation, ReadonlyException } from '../../epoxy'
import { map } from '../../operators';
import { expect } from 'chai';
// import mocha

describe('Mapped Listenable Collections', () => {
    it('returns a readonly collection', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const mappedArray = map(baseArray, (val) => Math.pow(2, val));
        expect(() => mappedArray.push(4)).throws(ReadonlyException);
    });

    it('maps array values and mutations', () => {
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const mappedArray = map(baseArray, (val) => Math.pow(2, val));
        expect(mappedArray).eql([2, 4, 8, 16, 32, 64]);

        let lastMutation: Mutation<number>;
        mappedArray.listen().subscribe((mutation) => lastMutation = mutation);

        baseArray.splice(0, 0, 0);
        expect(mappedArray).eql([1, 2, 4, 8, 16, 32, 64]);
        expect(lastMutation instanceof ArraySpliceMutation).true;
        const lastArrayMutation = lastMutation as ArraySpliceMutation<number>;
        expect(lastArrayMutation.inserted[0]).equals(1);

        baseArray[6] = 7;
        expect(mappedArray).eql([1, 2, 4, 8, 16, 32, 128]);
        expect(lastMutation instanceof PropertyMutation).true;
        const lastPropMutation = lastMutation as PropertyMutation<number>;
        expect(lastPropMutation.oldValue).equals(64);
        expect(lastPropMutation.newValue).equals(128);
    });

    it('maps object values and mutations', () => {
        const baseObject = makeListenable({'a': 1, 'b': 2});
        const mappedObject = map(baseObject, (val, key) => key);
        expect(mappedObject).eql({'a': 'a', 'b': 'b'});

        let lastMutation: Mutation<number>;
        mappedObject.listen().subscribe((mutation) => lastMutation = mutation);

        baseObject['c'] = 42;
        expect(mappedObject).eql({'a': 'a', 'b': 'b', 'c': 'c'});
        expect(lastMutation instanceof PropertyMutation).true;
        let lastPropMutation = lastMutation as PropertyMutation<string>;
        expect(lastPropMutation.key).equals('c');
        expect(lastPropMutation.newValue).equals('c');
        expect(lastPropMutation.oldValue).equals(undefined);

        delete baseObject['b'];
        expect(mappedObject).eql({'a': 'a', 'b': undefined, 'c': 'c'});
        expect(lastMutation instanceof PropertyMutation).true;
        lastPropMutation = lastMutation as PropertyMutation<string>;
        expect(lastPropMutation.key).equals('b');
        expect(lastPropMutation.newValue).equals(undefined);
        expect(lastPropMutation.oldValue).equals('b');
    });

    it('can depend on other Epoxy values', () => {
        const state = makeListenable({base: 2});
        const baseArray = makeListenable([1, 2, 3, 4, 5, 6]);
        const mappedArray = map(baseArray, (val) => Math.pow(state['base'], val));
        expect(mappedArray).eql([2, 4, 8, 16, 32, 64]);

        state['base'] = 3;
        expect(mappedArray).eql([3, 9, 27, 81, 243, 729]);
    });
});