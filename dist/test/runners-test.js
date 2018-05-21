"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../epoxy");
const chai_1 = require("chai");
// import mocha
describe('Function runners', () => {
    it('should re-run the function whenever a dependency value changes', () => {
        const state = epoxy_1.makeListenable({
            value: 4,
        });
        let lastStateValue;
        let runCount = 0;
        epoxy_1.autorun(() => {
            lastStateValue = state.value;
            runCount++;
        });
        chai_1.expect(runCount).eqls(1);
        chai_1.expect(lastStateValue).eqls(4);
        state.value = 5;
        chai_1.expect(runCount).eqls(2);
        chai_1.expect(lastStateValue).eqls(5);
    });
    it('should observe individual values', () => {
        const state = epoxy_1.makeListenable({
            value: 4,
        });
        const stream = epoxy_1.observe(() => state.value);
        let lastValue;
        stream.subscribe((value) => lastValue = value);
        chai_1.expect(lastValue).eqls(4);
        state.value = -1;
        chai_1.expect(lastValue).eqls(-1);
    });
    it('should error when no Epoxy values are passed', () => {
        chai_1.expect(() => epoxy_1.observe(() => 4)).throws();
    });
    it('should observe individual values', () => {
        const state = epoxy_1.makeListenable({
            a: 1,
            b: 2,
        });
        chai_1.expect(() => epoxy_1.observe(() => state.a + state.b)).throws();
    });
    it('should compute values derived from multiple epoxy values', () => {
        const state = epoxy_1.makeListenable({
            a: 1,
            b: 2,
        });
        const sum = epoxy_1.computed(() => state.a + state.b);
        let lastSum;
        sum.subscribe((newValue) => lastSum = newValue);
        chai_1.expect(lastSum).equals(3);
        state.a = 2;
        chai_1.expect(lastSum).equals(4);
    });
    it('should compute values derived from an epoxy array', () => {
        const numbers = epoxy_1.makeListenable([1, 2, 3, 4]);
        const sum = epoxy_1.computed(() => numbers.reduce((i, a) => i + a));
        let lastSum;
        sum.subscribe((newValue) => lastSum = newValue);
        chai_1.expect(lastSum).equals(10);
        numbers.push(5);
        chai_1.expect(lastSum).equals(15);
        numbers.splice(0, 1);
        chai_1.expect(lastSum).equals(14);
        numbers[0] = 0;
        chai_1.expect(lastSum).equals(12);
    });
    it('should not compute values from a non-epoxy array', () => {
        const numbers = [1, 2, 3, 4];
        const sum = epoxy_1.optionallyComputed(() => numbers.reduce((i, a) => i + a));
        chai_1.expect(typeof sum === 'number');
        chai_1.expect(sum).equals(10);
    });
    it('should unsubscribe from autorun listeners', () => {
        const state = epoxy_1.makeListenable({
            value: 4,
        });
        let lastStateValue;
        let runCount = 0;
        const unsubscribe = epoxy_1.autorun(() => {
            lastStateValue = state.value;
            runCount++;
        });
        chai_1.expect(runCount).eqls(1);
        chai_1.expect(lastStateValue).eqls(4);
        unsubscribe();
        state.value = 5;
        chai_1.expect(runCount).eqls(1);
        chai_1.expect(lastStateValue).eqls(4);
    });
});
