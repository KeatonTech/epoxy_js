import { Transaction, makeListenable } from '../epoxy';
import { expect } from 'chai';
// import mocha

describe('Function Decorators', () => {
    it('should only dispatch one change notification after a transaction', () => {
        const listenable = makeListenable([]);
        let mutationCount = 0;
        listenable.asObservable().subscribe(() => mutationCount++);

        class TestFuncs {
            @Transaction
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(mutationCount).equals(1);
    });
});