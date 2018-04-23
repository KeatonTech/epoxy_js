"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const epoxy_1 = require("../epoxy");
const chai_1 = require("chai");
// import mocha
describe('Function Decorators', () => {
    it('should only dispatch one change notification after a transaction', () => {
        const listenable = epoxy_1.makeListenable([]);
        let mutationCount = 0;
        listenable.asObservable().subscribe(() => mutationCount++);
        class TestFuncs {
            static pushABunchOfStuffToAList(list) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }
        __decorate([
            epoxy_1.Transaction
        ], TestFuncs, "pushABunchOfStuffToAList", null);
        TestFuncs.pushABunchOfStuffToAList(listenable);
        chai_1.expect(mutationCount).equals(1);
    });
});
