import {makeListenable, Mutation, ArraySpliceMutation, SubpropertyMutation, computed, PropertyMutation} from '../epoxy';
import { expect } from 'chai';
import { last } from 'rxjs/operators';
// import mocha

describe('Array Watcher', () => {
    it('should trigger an ArraySpliceMutation on the push() function', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray.push('hey');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hey']);
        }
        
        listenableArray.push('hi');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(1);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hi']);
        }
    });

    it('should trigger an ArraySpliceMutation on the splice() function', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray.splice(0, 0, 'hey', 'how', 'are', 'you?');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hey', 'how', 'are', 'you?']);
        }
        
        listenableArray.splice(2, 1);
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(2);
            expect(lastMutation.deleted).eql(['are']);
            expect(lastMutation.inserted).eql([]);
        }
    });

    it('should trigger a PropertyMutation when a value is set', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([1, 1]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray[1] = 2;
        expect(lastMutation).instanceof(PropertyMutation);
        if (lastMutation instanceof PropertyMutation) {
            expect(lastMutation.key).equals(1);
            expect(lastMutation.oldValue).equals(1);
            expect(lastMutation.newValue).equals(2);
        }
    });

    it('should listen to changes in child arrays', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([[1, 2, 3]]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray[0].push(4);
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.mutation).instanceof(ArraySpliceMutation);
            expect(lastMutation.mutation.key).equals(3);
        }
    });

    it('should create property observables', () => {
        const listenableArray = makeListenable([1, 1]);
        const values = [];
        listenableArray.observables()[0].subscribe((newVal) => values.push(newVal));

        expect(values.length).equals(1);
        expect(values[0]).equals(1);

        listenableArray[0] = 10;
        listenableArray[1] = -10;
        expect(values.length).equals(2);
        expect(values[1]).equals(10);
    });

    it('should work with computed properties', () => {
        const listenableArray = makeListenable([1, 1]);
        const sum = computed(() => listenableArray[0] + listenableArray[1]);

        const sumValues = [];
        sum.subscribe((newSum) => sumValues.push(newSum));

        expect(sumValues.length).equals(1);
        expect(sumValues[0]).equals(2);

        listenableArray[0] = 2;
        expect(sumValues.length).equals(2);
        expect(sumValues[1]).equals(3);

        listenableArray[1] = -2;
        expect(sumValues.length).equals(3);
        expect(sumValues[2]).equals(0);

        listenableArray.splice(0, 0, 20);
        expect(sumValues.length).equals(4);
        expect(sumValues[3]).equals(22);
    });

    it('should be able to apply mutations', () => {
        const listenableArray = makeListenable([1, 1]);
        
        listenableArray.applyMutation(new PropertyMutation(0, 1, 2));
        expect(listenableArray).eql([2, 1]);
        
        listenableArray.applyMutation(new ArraySpliceMutation(0, [2], []));
        expect(listenableArray).eql([1]);
        
        listenableArray.applyMutation(new ArraySpliceMutation(0, [], [0]));
        expect(listenableArray).eql([0, 1]);

        const deepListenableArray = makeListenable([[0, 1], [2, 3]]);
        deepListenableArray.applyMutation(new SubpropertyMutation(0, new PropertyMutation(1, 1, -1)));
        expect(deepListenableArray).eql([[0, -1], [2, 3]]);
    });

    it('should be able to un-apply mutations', () => {
        const listenableArray = makeListenable([2, 1]);
        
        listenableArray.unapplyMutation(new PropertyMutation(0, 1, 2));
        expect(listenableArray).eql([1, 1]);
        
        listenableArray.unapplyMutation(new ArraySpliceMutation(0, [2], []));
        expect(listenableArray).eql([2, 1, 1]);
        
        listenableArray.unapplyMutation(new ArraySpliceMutation(1, [], [1]));
        expect(listenableArray).eql([2, 1]);

        const deepListenableArray = makeListenable([[0, -1], [2, 3]]);
        deepListenableArray.unapplyMutation(new SubpropertyMutation(0, new PropertyMutation(1, 1, -1)));
        expect(deepListenableArray).eql([[0, 1], [2, 3]]);
    });
});