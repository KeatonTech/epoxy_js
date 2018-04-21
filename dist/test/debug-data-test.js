"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../epoxy");
const chai_1 = require("chai");
// import mocha
describe('Global DebugData', () => {
    it('should have references to all named data structures', () => {
        const listenableObject = epoxy_1.makeListenable({ key: 'value' });
        listenableObject.debugWithLabel('Listenable Object');
        chai_1.expect(Object.keys(epoxy_1.EpoxyGlobalState.DebugData)).length(1);
        chai_1.expect(Object.keys(epoxy_1.EpoxyGlobalState.DebugData)[0]).equals('Listenable Object');
        const listenableArray = epoxy_1.makeListenable([1, 1, 2, 3]);
        listenableArray.debugWithLabel('Listenable Array');
        chai_1.expect(Object.keys(epoxy_1.EpoxyGlobalState.DebugData)).length(2);
        chai_1.expect(Object.keys(epoxy_1.EpoxyGlobalState.DebugData)[1]).equals('Listenable Array');
    });
    it('should keep a list of all mutations to arrays', () => {
        const listenableArray = epoxy_1.makeListenable([1, 1, 2, 3]);
        listenableArray.debugWithLabel('array');
        const mutationList = epoxy_1.EpoxyGlobalState.DebugData['array'];
        chai_1.expect(mutationList).length(1);
        chai_1.expect(mutationList[0].stack).not.null;
        chai_1.expect(mutationList[0].mutation instanceof epoxy_1.ValueMutation).true;
        chai_1.expect(mutationList[0].mutation.newValue).eql([1, 1, 2, 3]);
        listenableArray.push(5);
        chai_1.expect(mutationList).length(2);
        chai_1.expect(mutationList[1].stack).not.null;
        chai_1.expect(mutationList[1].mutation instanceof epoxy_1.ArraySpliceMutation).true;
        chai_1.expect(mutationList[1].mutation.inserted).eql([5]);
    });
    it('should keep a list of all mutations to object', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 'a', b: 'b' });
        listenableObject.debugWithLabel('object');
        const mutationList = epoxy_1.EpoxyGlobalState.DebugData['object'];
        chai_1.expect(mutationList).length(1);
        chai_1.expect(mutationList[0].stack).not.null;
        chai_1.expect(mutationList[0].mutation instanceof epoxy_1.ValueMutation).true;
        chai_1.expect(mutationList[0].mutation.newValue).eql({ a: 'a', b: 'b' });
        listenableObject['c'] = 'c';
        chai_1.expect(mutationList).length(2);
        chai_1.expect(mutationList[1].stack).not.null;
        chai_1.expect(mutationList[1].mutation instanceof epoxy_1.PropertyMutation).true;
        ;
        chai_1.expect(mutationList[1].mutation.key).equals('c');
        chai_1.expect(mutationList[1].mutation.newValue).equals('c');
    });
});
