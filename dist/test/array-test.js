"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../epoxy");
const chai_1 = require("chai");
const rxjs_1 = require("rxjs");
// import mocha
describe('Array Watcher', () => {
    it('can be initialized with observables', () => {
        const valueSubject = new rxjs_1.BehaviorSubject(1);
        const listenableArray = epoxy_1.makeListenable([valueSubject.asObservable()]);
        chai_1.expect(listenableArray).eqls([1]);
        let lastMutation;
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        valueSubject.next(2);
        chai_1.expect(listenableArray).eqls([2]);
        chai_1.expect(lastMutation instanceof epoxy_1.PropertyMutation).true;
        chai_1.expect(lastMutation.key).equals(0);
        chai_1.expect(lastMutation.oldValue).equals(1);
        chai_1.expect(lastMutation.newValue).equals(2);
    });
    it('can be initialized with observables that resolve out of order', () => {
        const valueSubject1 = new rxjs_1.Subject();
        const valueSubject2 = new rxjs_1.BehaviorSubject(2);
        const listenableArray = epoxy_1.makeListenable([
            valueSubject1.asObservable(),
            valueSubject2.asObservable()
        ]);
        chai_1.expect(listenableArray[0] instanceof rxjs_1.Observable).true;
        chai_1.expect(listenableArray[1]).eqls(2);
        let lastMutation;
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        valueSubject1.next(1);
        chai_1.expect(listenableArray).eqls([1, 2]);
    });
    it('should trigger an ArraySpliceMutation on the push() function', () => {
        let lastMutation;
        const listenableArray = epoxy_1.makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        listenableArray.push('hey');
        chai_1.expect(lastMutation).instanceof(epoxy_1.ArraySpliceMutation);
        if (lastMutation instanceof epoxy_1.ArraySpliceMutation) {
            chai_1.expect(lastMutation.key).equals(0);
            chai_1.expect(lastMutation.deleted).eql([]);
            chai_1.expect(lastMutation.inserted).eql(['hey']);
        }
        listenableArray.push('hi');
        chai_1.expect(lastMutation).instanceof(epoxy_1.ArraySpliceMutation);
        if (lastMutation instanceof epoxy_1.ArraySpliceMutation) {
            chai_1.expect(lastMutation.key).equals(1);
            chai_1.expect(lastMutation.deleted).eql([]);
            chai_1.expect(lastMutation.inserted).eql(['hi']);
        }
    });
    it('should trigger an ArraySpliceMutation on the splice() function', () => {
        let lastMutation;
        const listenableArray = epoxy_1.makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        listenableArray.splice(0, 0, 'hey', 'how', 'are', 'you?');
        chai_1.expect(lastMutation).instanceof(epoxy_1.ArraySpliceMutation);
        if (lastMutation instanceof epoxy_1.ArraySpliceMutation) {
            chai_1.expect(lastMutation.key).equals(0);
            chai_1.expect(lastMutation.deleted).eql([]);
            chai_1.expect(lastMutation.inserted).eql(['hey', 'how', 'are', 'you?']);
        }
        listenableArray.splice(2, 1);
        chai_1.expect(lastMutation).instanceof(epoxy_1.ArraySpliceMutation);
        if (lastMutation instanceof epoxy_1.ArraySpliceMutation) {
            chai_1.expect(lastMutation.key).equals(2);
            chai_1.expect(lastMutation.deleted).eql(['are']);
            chai_1.expect(lastMutation.inserted).eql([]);
        }
    });
    it('should trigger a PropertyMutation when a value is set', () => {
        let lastMutation;
        const listenableArray = epoxy_1.makeListenable([1, 1]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        listenableArray[1] = 2;
        chai_1.expect(lastMutation).instanceof(epoxy_1.PropertyMutation);
        if (lastMutation instanceof epoxy_1.PropertyMutation) {
            chai_1.expect(lastMutation.key).equals(1);
            chai_1.expect(lastMutation.oldValue).equals(1);
            chai_1.expect(lastMutation.newValue).equals(2);
        }
    });
    it('should listen to changes in child arrays', () => {
        let lastMutation;
        const listenableArray = epoxy_1.makeListenable([[1, 2, 3]]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);
        listenableArray[0].push(4);
        chai_1.expect(lastMutation).instanceof(epoxy_1.SubpropertyMutation);
        if (lastMutation instanceof epoxy_1.SubpropertyMutation) {
            chai_1.expect(lastMutation.key).equals(0);
            chai_1.expect(lastMutation.mutation).instanceof(epoxy_1.ArraySpliceMutation);
            chai_1.expect(lastMutation.mutation.key).equals(3);
        }
    });
    it('should create property observables', () => {
        const listenableArray = epoxy_1.makeListenable([1, 1]);
        const values = [];
        listenableArray.observables()[0].subscribe((newVal) => values.push(newVal));
        chai_1.expect(values.length).equals(1);
        chai_1.expect(values[0]).equals(1);
        listenableArray[0] = 10;
        listenableArray[1] = -10;
        chai_1.expect(values.length).equals(2);
        chai_1.expect(values[1]).equals(10);
    });
    it('should work with computed properties', () => {
        const listenableArray = epoxy_1.makeListenable([1, 1]);
        const sum = epoxy_1.computed(() => listenableArray[0] + listenableArray[1]);
        const sumValues = [];
        sum.subscribe((newSum) => sumValues.push(newSum));
        chai_1.expect(sumValues.length).equals(1);
        chai_1.expect(sumValues[0]).equals(2);
        listenableArray[0] = 2;
        chai_1.expect(sumValues.length).equals(2);
        chai_1.expect(sumValues[1]).equals(3);
        listenableArray[1] = -2;
        chai_1.expect(sumValues.length).equals(3);
        chai_1.expect(sumValues[2]).equals(0);
        listenableArray.splice(0, 0, 20);
        chai_1.expect(sumValues.length).equals(4);
        chai_1.expect(sumValues[3]).equals(22);
    });
    it('should be able to apply mutations', () => {
        const listenableArray = epoxy_1.makeListenable([1, 1]);
        listenableArray.applyMutation(new epoxy_1.PropertyMutation(0, 1, 2));
        chai_1.expect(listenableArray).eql([2, 1]);
        listenableArray.applyMutation(new epoxy_1.ArraySpliceMutation(0, [2], []));
        chai_1.expect(listenableArray).eql([1]);
        listenableArray.applyMutation(new epoxy_1.ArraySpliceMutation(0, [], [0]));
        chai_1.expect(listenableArray).eql([0, 1]);
        const deepListenableArray = epoxy_1.makeListenable([[0, 1], [2, 3]]);
        deepListenableArray.applyMutation(new epoxy_1.SubpropertyMutation(0, new epoxy_1.PropertyMutation(1, 1, -1)));
        chai_1.expect(deepListenableArray).eql([[0, -1], [2, 3]]);
    });
    it('should be able to un-apply mutations', () => {
        const listenableArray = epoxy_1.makeListenable([2, 1]);
        listenableArray.unapplyMutation(new epoxy_1.PropertyMutation(0, 1, 2));
        chai_1.expect(listenableArray).eql([1, 1]);
        listenableArray.unapplyMutation(new epoxy_1.ArraySpliceMutation(0, [2], []));
        chai_1.expect(listenableArray).eql([2, 1, 1]);
        listenableArray.unapplyMutation(new epoxy_1.ArraySpliceMutation(1, [], [1]));
        chai_1.expect(listenableArray).eql([2, 1]);
        const deepListenableArray = epoxy_1.makeListenable([[0, -1], [2, 3]]);
        deepListenableArray.unapplyMutation(new epoxy_1.SubpropertyMutation(0, new epoxy_1.PropertyMutation(1, 1, -1)));
        chai_1.expect(deepListenableArray).eql([[0, 1], [2, 3]]);
    });
    it('can generate a reactive fibonnaci sequence', () => {
        const fibonnaci = epoxy_1.makeListenable([1, 1]);
        for (let i = 0; i < 10; i++) {
            const n = i; // Make a new variable for each iteration.
            fibonnaci.push(epoxy_1.computed(() => fibonnaci[n] + fibonnaci[n + 1]));
        }
        chai_1.expect(fibonnaci).eql([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);
        fibonnaci[0] = 0;
        chai_1.expect(fibonnaci).eql([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
        fibonnaci[1] = 0;
        chai_1.expect(fibonnaci).eql([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });
    it('can create a readonly copy', () => {
        const numbers = epoxy_1.makeListenable([1, 2, 3, 4]);
        const readonly = numbers.asReadonly();
        chai_1.expect(() => readonly[0] = 2).throws(epoxy_1.ReadonlyException);
        chai_1.expect(() => readonly.push(5)).throws(epoxy_1.ReadonlyException);
        chai_1.expect(() => delete readonly[1]).throws(epoxy_1.ReadonlyException);
        chai_1.expect(() => readonly.applyMutation(new epoxy_1.ValueMutation(1, 2))).throws(epoxy_1.ReadonlyException);
    });
    it('the readonly copy keeps up with mutations to the original', () => {
        let lastMutation;
        const listenableArray = epoxy_1.makeListenable([]);
        const readonly = listenableArray.asReadonly();
        readonly.listen().subscribe((mutation) => lastMutation = mutation);
        listenableArray.push('hey');
        chai_1.expect(lastMutation).instanceof(epoxy_1.ArraySpliceMutation);
        if (lastMutation instanceof epoxy_1.ArraySpliceMutation) {
            chai_1.expect(lastMutation.key).equals(0);
            chai_1.expect(lastMutation.deleted).eql([]);
            chai_1.expect(lastMutation.inserted).eql(['hey']);
        }
    });
});
