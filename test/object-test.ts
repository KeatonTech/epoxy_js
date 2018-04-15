import {makeListenable, Mutation, ArraySpliceMutation, SubpropertyMutation, computed, PropertyMutation} from '../epoxy';
import { expect } from 'chai';
import { last } from 'rxjs/operators';
// import mocha

describe('Object Watcher', () => {
    it('should trigger a PropertyMutation when a value is added', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({a: 'a'});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        listenableObject['b'] = 'b';
        expect(lastMutation).instanceof(PropertyMutation);
        if (lastMutation instanceof PropertyMutation) {
            expect(lastMutation.key).equals('b');
            expect(lastMutation.oldValue).equals(undefined);
            expect(lastMutation.newValue).equals('b');
        }
    });

    it('should trigger a PropertyMutation when a value is set', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({a: 'a', b: 'a'});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        listenableObject['b'] = 'b';
        expect(lastMutation).instanceof(PropertyMutation);
        if (lastMutation instanceof PropertyMutation) {
            expect(lastMutation.key).equals('b');
            expect(lastMutation.oldValue).equals('a');
            expect(lastMutation.newValue).equals('b');
        }
    });

    it('should listen to changes in child arrays', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({'list': [1, 2, 3]});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        listenableObject['list'].push(4);
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals('list');
            expect(lastMutation.mutation).instanceof(ArraySpliceMutation);
            expect(lastMutation.mutation.key).equals(3);
        }
    });

    it('should listen to changes in child objects', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({'obj': {}});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        listenableObject['obj']['item'] = 'value';
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals('obj');
            expect(lastMutation.mutation).instanceof(PropertyMutation);
            expect(lastMutation.mutation.key).equals('item');
        }
    });

    it('should listen to changes in inserted child objects', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        listenableObject['obj'] = {};
        listenableObject['obj']['item'] = 'value';
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals('obj');
            expect(lastMutation.mutation).instanceof(PropertyMutation);
            expect(lastMutation.mutation.key).equals('item');
        }
    });

    it('should stop listening to child object when they are set to a different value', () => {
        let lastMutation: Mutation<string>;
        const listenableObject = makeListenable({});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);

        const childObject = makeListenable({});
        listenableObject['obj'] = childObject;
        childObject['item'] = 'value';
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals('obj');
            expect(lastMutation.mutation).instanceof(PropertyMutation);
            expect(lastMutation.mutation.key).equals('item');
        }

        listenableObject['obj'] = 1;
        expect(lastMutation).instanceof(PropertyMutation);

        childObject['item'] = 'newvalue';
        expect(lastMutation).instanceof(PropertyMutation);
    });

    it('should create property observables', () => {
        const listenableObject = makeListenable({a: 'a'});
        const values = [];
        listenableObject.observables()['a'].subscribe((newVal) => values.push(newVal));

        expect(values.length).equals(1);
        expect(values[0]).equals('a');

        listenableObject['a'] = 'b';
        expect(values.length).equals(2);
        expect(values[1]).equals('b');
    });

    it('should work with computed properties', () => {
        const listenableObject = makeListenable({a: 1, b: 1});
        const sum = computed(() => listenableObject['a'] + listenableObject['b']);

        const sumValues = [];
        sum.subscribe((newSum) => sumValues.push(newSum));

        expect(sumValues.length).equals(1);
        expect(sumValues[0]).equals(2);

        listenableObject['a'] = 2;
        expect(sumValues.length).equals(2);
        expect(sumValues[1]).equals(3);

        listenableObject['b'] = -2;
        expect(sumValues.length).equals(3);
        expect(sumValues[2]).equals(0);
    });

    it('should be able to apply mutations', () => {
        const listenableObject = makeListenable({a: 1, b: 2});
        
        listenableObject.applyMutation(new PropertyMutation('a', 1, 2));
        expect(listenableObject).eql({a: 2, b: 2});

        const deeplistenableObject = makeListenable({obj: {a: 1, b: 2}});
        deeplistenableObject.applyMutation(new SubpropertyMutation('obj', new PropertyMutation('a', 1, -1)));
        expect(deeplistenableObject).eql({obj: {a: -1, b: 2}});
    });

    it('should be able to un-apply mutations', () => {
        const listenableObject = makeListenable({a: 2, b: 2});
        
        listenableObject.unapplyMutation(new PropertyMutation('a', 1, 2));
        expect(listenableObject).eql({a: 1, b: 2});

        const deeplistenableObject = makeListenable({obj: {a: -1, b: 2}});
        deeplistenableObject.unapplyMutation(new SubpropertyMutation('obj', new PropertyMutation('a', 1, -1)));
        expect(deeplistenableObject).eql({obj: {a: 1, b: 2}});
    });
});