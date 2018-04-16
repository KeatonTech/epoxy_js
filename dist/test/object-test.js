"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../epoxy");
const chai_1 = require("chai");
// import mocha
describe('Object Watcher', () => {
    it('should trigger a PropertyMutation when a value is added', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({ a: 'a' });
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        listenableObject['b'] = 'b';
        chai_1.expect(lastMutation).instanceof(epoxy_1.PropertyMutation);
        if (lastMutation instanceof epoxy_1.PropertyMutation) {
            chai_1.expect(lastMutation.key).equals('b');
            chai_1.expect(lastMutation.oldValue).equals(undefined);
            chai_1.expect(lastMutation.newValue).equals('b');
        }
    });
    it('should trigger a PropertyMutation when a value is set', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({ a: 'a', b: 'a' });
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        listenableObject['b'] = 'b';
        chai_1.expect(lastMutation).instanceof(epoxy_1.PropertyMutation);
        if (lastMutation instanceof epoxy_1.PropertyMutation) {
            chai_1.expect(lastMutation.key).equals('b');
            chai_1.expect(lastMutation.oldValue).equals('a');
            chai_1.expect(lastMutation.newValue).equals('b');
        }
    });
    it('should listen to changes in child arrays', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({ 'list': [1, 2, 3] });
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        listenableObject['list'].push(4);
        chai_1.expect(lastMutation).instanceof(epoxy_1.SubpropertyMutation);
        if (lastMutation instanceof epoxy_1.SubpropertyMutation) {
            chai_1.expect(lastMutation.key).equals('list');
            chai_1.expect(lastMutation.mutation).instanceof(epoxy_1.ArraySpliceMutation);
            chai_1.expect(lastMutation.mutation.key).equals(3);
        }
    });
    it('should listen to changes in child objects', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({ 'obj': {} });
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        listenableObject['obj']['item'] = 'value';
        chai_1.expect(lastMutation).instanceof(epoxy_1.SubpropertyMutation);
        if (lastMutation instanceof epoxy_1.SubpropertyMutation) {
            chai_1.expect(lastMutation.key).equals('obj');
            chai_1.expect(lastMutation.mutation).instanceof(epoxy_1.PropertyMutation);
            chai_1.expect(lastMutation.mutation.key).equals('item');
        }
    });
    it('should listen to changes in inserted child objects', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        listenableObject['obj'] = {};
        listenableObject['obj']['item'] = 'value';
        chai_1.expect(lastMutation).instanceof(epoxy_1.SubpropertyMutation);
        if (lastMutation instanceof epoxy_1.SubpropertyMutation) {
            chai_1.expect(lastMutation.key).equals('obj');
            chai_1.expect(lastMutation.mutation).instanceof(epoxy_1.PropertyMutation);
            chai_1.expect(lastMutation.mutation.key).equals('item');
        }
    });
    it('should stop listening to child object when they are set to a different value', () => {
        let lastMutation;
        const listenableObject = epoxy_1.makeListenable({});
        listenableObject.listen().subscribe((mutation) => lastMutation = mutation);
        const childObject = epoxy_1.makeListenable({});
        listenableObject['obj'] = childObject;
        childObject['item'] = 'value';
        chai_1.expect(lastMutation).instanceof(epoxy_1.SubpropertyMutation);
        if (lastMutation instanceof epoxy_1.SubpropertyMutation) {
            chai_1.expect(lastMutation.key).equals('obj');
            chai_1.expect(lastMutation.mutation).instanceof(epoxy_1.PropertyMutation);
            chai_1.expect(lastMutation.mutation.key).equals('item');
        }
        listenableObject['obj'] = 1;
        chai_1.expect(lastMutation).instanceof(epoxy_1.PropertyMutation);
        childObject['item'] = 'newvalue';
        chai_1.expect(lastMutation).instanceof(epoxy_1.PropertyMutation);
    });
    it('should create property observables', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 'a' });
        const values = [];
        listenableObject.observables()['a'].subscribe((newVal) => values.push(newVal));
        chai_1.expect(values.length).equals(1);
        chai_1.expect(values[0]).equals('a');
        listenableObject['a'] = 'b';
        chai_1.expect(values.length).equals(2);
        chai_1.expect(values[1]).equals('b');
    });
    it('should work with computed properties', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 1, b: 1 });
        const sum = epoxy_1.computed(() => listenableObject['a'] + listenableObject['b']);
        const sumValues = [];
        sum.subscribe((newSum) => sumValues.push(newSum));
        chai_1.expect(sumValues.length).equals(1);
        chai_1.expect(sumValues[0]).equals(2);
        listenableObject['a'] = 2;
        chai_1.expect(sumValues.length).equals(2);
        chai_1.expect(sumValues[1]).equals(3);
        listenableObject['b'] = -2;
        chai_1.expect(sumValues.length).equals(3);
        chai_1.expect(sumValues[2]).equals(0);
    });
    it('should be able to contain computed properties', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 1, b: 1 });
        listenableObject['sum'] = epoxy_1.computed(() => listenableObject['a'] + listenableObject['b']);
        let mutationsCount = 0;
        listenableObject.listen().subscribe((mutation) => mutationsCount++);
        listenableObject['a'] = 10;
        chai_1.expect(listenableObject['sum']).equals(11);
        chai_1.expect(mutationsCount).equals(2);
        listenableObject['sum'] = Infinity;
        chai_1.expect(listenableObject['sum']).equals(Infinity);
        chai_1.expect(mutationsCount).equals(3);
        listenableObject['a'] = 0;
        chai_1.expect(listenableObject['sum']).equals(Infinity);
        chai_1.expect(mutationsCount).equals(4);
        listenableObject.setComputed('sum', () => listenableObject['a'] + listenableObject['b']);
        chai_1.expect(listenableObject['sum']).equals(1);
        chai_1.expect(mutationsCount).equals(5);
        listenableObject['a'] = 10;
        chai_1.expect(listenableObject['sum']).equals(11);
        chai_1.expect(mutationsCount).equals(7);
    });
    it('should be able to apply mutations', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 1, b: 2 });
        listenableObject.applyMutation(new epoxy_1.PropertyMutation('a', 1, 2));
        chai_1.expect(listenableObject).eql({ a: 2, b: 2 });
        const deeplistenableObject = epoxy_1.makeListenable({ obj: { a: 1, b: 2 } });
        deeplistenableObject.applyMutation(new epoxy_1.SubpropertyMutation('obj', new epoxy_1.PropertyMutation('a', 1, -1)));
        chai_1.expect(deeplistenableObject).eql({ obj: { a: -1, b: 2 } });
    });
    it('should be able to un-apply mutations', () => {
        const listenableObject = epoxy_1.makeListenable({ a: 2, b: 2 });
        listenableObject.unapplyMutation(new epoxy_1.PropertyMutation('a', 1, 2));
        chai_1.expect(listenableObject).eql({ a: 1, b: 2 });
        const deeplistenableObject = epoxy_1.makeListenable({ obj: { a: -1, b: 2 } });
        deeplistenableObject.unapplyMutation(new epoxy_1.SubpropertyMutation('obj', new epoxy_1.PropertyMutation('a', 1, -1)));
        chai_1.expect(deeplistenableObject).eql({ obj: { a: 1, b: 2 } });
    });
});
