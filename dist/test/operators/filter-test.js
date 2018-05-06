"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../../epoxy");
const operators_1 = require("../../operators");
const chai_1 = require("chai");
// import mocha
describe('Filtered Listenable Collections', () => {
    it('returns a readonly array', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        chai_1.expect(() => filteredArray.push(4)).throws(epoxy_1.ReadonlyException);
    });
    it('returns a filtered array', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
    });
    it('does not append items that fail the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.push(7);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
    });
    it('appends items that pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.push(7);
        baseArray.push(8);
        chai_1.expect(filteredArray).eqls([2, 4, 6, 8]);
    });
    it('does not splice items that fail the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 0, 7);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
    });
    it('splices items that pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 0, 10);
        baseArray.splice(2, 0, 11);
        baseArray.splice(2, 0, 12);
        chai_1.expect(filteredArray).eqls([2, 12, 10, 4, 6]);
    });
    it('deletes items that pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(3, 1);
        chai_1.expect(filteredArray).eqls([2, 6]);
        baseArray.splice(1, 1);
        chai_1.expect(filteredArray).eqls([6]);
        baseArray.splice(3, 1);
        chai_1.expect(filteredArray).eqls([]);
    });
    it('does not delete items that do not pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray.splice(2, 1);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
        baseArray.splice(0, 1);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
        baseArray.splice(2, 1);
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
    });
    it('updates items so they still pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray[1] = 10;
        chai_1.expect(filteredArray).eqls([10, 4, 6]);
    });
    it('updates items so they no longer pass the filter', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray[1] = 3;
        chai_1.expect(filteredArray).eqls([4, 6]);
    });
    it('does nothing when a filtered item is changed but still filtered', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray[0] = -1;
        chai_1.expect(filteredArray).eqls([2, 4, 6]);
    });
    it('adds an item when a filtered item is changed to no longer be filtered', () => {
        const baseArray = epoxy_1.makeListenable([1, 2, 3, 4, 5, 6]);
        const filteredArray = operators_1.filter(baseArray, (val) => val % 2 == 0);
        baseArray[0] = 0;
        chai_1.expect(filteredArray).eqls([0, 2, 4, 6]);
        baseArray[2] = 30;
        chai_1.expect(filteredArray).eqls([0, 2, 30, 4, 6]);
    });
    it('returns a filtered object', () => {
        const baseArray = epoxy_1.makeListenable({
            "a": "Some Uppercase",
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "A",
        });
        const filteredArray = operators_1.filter(baseArray, (val) => val.toLowerCase() == val);
        chai_1.expect(filteredArray).eqls({
            "b": "all-lowercase",
            "c": "more-lowercase",
        });
    });
    it('adds rows to a filtered object', () => {
        const baseArray = epoxy_1.makeListenable({
            "a": "Some Uppercase",
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "A",
        });
        const filteredArray = operators_1.filter(baseArray, (val) => val.toLowerCase() == val);
        baseArray["e"] = "e";
        chai_1.expect(filteredArray).eqls({
            "b": "all-lowercase",
            "c": "more-lowercase",
            "e": "e",
        });
    });
    it('does not add filtered rows to a filtered object', () => {
        const baseArray = epoxy_1.makeListenable({
            "a": "Some Uppercase",
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "A",
        });
        const filteredArray = operators_1.filter(baseArray, (val) => val.toLowerCase() == val);
        baseArray["e"] = "E";
        chai_1.expect(filteredArray).eqls({
            "b": "all-lowercase",
            "c": "more-lowercase",
        });
    });
    it('removes rows when they no longer pass the filter', () => {
        const baseArray = epoxy_1.makeListenable({
            "a": "Some Uppercase",
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "A",
        });
        const filteredArray = operators_1.filter(baseArray, (val) => val.toLowerCase() == val);
        baseArray["c"] = "C";
        chai_1.expect(filteredArray).eqls({
            "b": "all-lowercase",
        });
    });
    it('adds rows when they newly pass the filter', () => {
        const baseArray = epoxy_1.makeListenable({
            "a": "Some Uppercase",
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "A",
        });
        const filteredArray = operators_1.filter(baseArray, (val) => val.toLowerCase() == val);
        baseArray["d"] = "d";
        chai_1.expect(filteredArray).eqls({
            "b": "all-lowercase",
            "c": "more-lowercase",
            "d": "d",
        });
    });
});
