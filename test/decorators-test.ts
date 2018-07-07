import { Mutation, Transaction, makeListenable, runTransaction, ArraySpliceMutation } from '../epoxy';
import { expect } from 'chai';
// import mocha

describe('Function Decorators', () => {
    it('should only dispatch one change notification after a transaction', () => {
        const listenable = makeListenable([]);
        let mutationCount = 0;
        listenable.asObservable().subscribe(() => mutationCount++);

        class TestFuncs {
            @Transaction()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(mutationCount).equals(1);
    });

    it('should optimize mutations', () => {
        const listenable = makeListenable([]);
        const mutations = [];
        listenable.listen().subscribe(mutations.push.bind(mutations));

        class TestFuncs {
            @Transaction()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(mutations.length).eqls(1);
        expect((mutations[0] as ArraySpliceMutation<any>).key).eqls(0);
        expect((mutations[0] as ArraySpliceMutation<any>).inserted.length).eqls(100);
    });

    it('should automatically name the transaction for the function name', () => {
        const listenable = makeListenable([]);
        let lastMutation: Mutation<any>;
        listenable.listen().subscribe((mutation) => lastMutation = mutation);

        class TestFuncs {
            @Transaction()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(lastMutation.fromBatch).eqls('pushABunchOfStuffToAList');
    });

    it('can accept explicit transaction names', () => {
        const listenable = makeListenable([]);
        let lastMutation: Mutation<any>;
        listenable.listen().subscribe((mutation) => lastMutation = mutation);

        class TestFuncs {
            @Transaction('TestFuncs: Bulk Add')
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(lastMutation.fromBatch).eqls('TestFuncs: Bulk Add');
    });

    it('works as a function call, in addition to the decorator', () => {
        const listenable = makeListenable([]);
        let lastMutation: Mutation<any>;
        listenable.listen().subscribe((mutation) => lastMutation = mutation);

        class TestFuncs {
            static pushABunchOfStuffToAList(list: Array<number>) {
                runTransaction('BulkAdd', () => {
                    for (let i = 0; i < 100; i++) {
                        list.push(i);
                    }
                });
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(lastMutation.fromBatch).eqls('BulkAdd');
    });
});