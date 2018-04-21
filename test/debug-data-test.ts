import {makeListenable, Mutation, ArraySpliceMutation, SubpropertyMutation, computed, PropertyMutation, IListenableArray, EpoxyGlobalState, ValueMutation} from '../epoxy';
import { expect } from 'chai';
import { last } from 'rxjs/operators';
// import mocha

describe('Global DebugData', () => {
    it('should have references to all named data structures', () => {
        const listenableObject = makeListenable({key: 'value'});
        listenableObject.debugWithLabel('Listenable Object');

        expect(Object.keys(EpoxyGlobalState.DebugData)).length(1);
        expect(Object.keys(EpoxyGlobalState.DebugData)[0]).equals('Listenable Object');

        const listenableArray = makeListenable([1, 1, 2, 3]);
        listenableArray.debugWithLabel('Listenable Array');

        expect(Object.keys(EpoxyGlobalState.DebugData)).length(2);
        expect(Object.keys(EpoxyGlobalState.DebugData)[1]).equals('Listenable Array');
    });

    it('should keep a list of all mutations to arrays', () => {
        const listenableArray = makeListenable([1, 1, 2, 3]);
        listenableArray.debugWithLabel('array');

        const mutationList = EpoxyGlobalState.DebugData['array'];
        expect(mutationList).length(1);
        expect(mutationList[0] instanceof ValueMutation);
        expect(mutationList[0].newValue).eql([1, 1, 2, 3]);

        listenableArray.push(5);
        expect(mutationList).length(2);
        expect(mutationList[1] instanceof ArraySpliceMutation);
        expect(mutationList[1].inserted).eql([5]);
    });

    it('should keep a list of all mutations to object', () => {
        const listenableObject = makeListenable({a: 'a', b: 'b'});
        listenableObject.debugWithLabel('object');

        const mutationList = EpoxyGlobalState.DebugData['object'];
        expect(mutationList).length(1);
        expect(mutationList[0] instanceof ValueMutation);
        expect(mutationList[0].newValue).eql({a: 'a', b: 'b'});

        listenableObject['c'] = 'c';
        expect(mutationList).length(2);
        expect(mutationList[1] instanceof PropertyMutation);
        expect(mutationList[1].key).equals('c');
        expect(mutationList[1].newValue).equals('c');
    });
});