import { BatchOperation, Mutation, Transaction, makeListenable, runTransaction, ArraySpliceMutation, EpoxyGlobalState } from '../epoxy';
import { installDebugHooks, DebuggableMutation } from '../debugger';
import { expect } from 'chai';
// import mocha

describe('Batch Operations', () => {
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
        expect(listenable.length).equals(100);
    });

    it('should rollback changes when an error occurs when using a Transaction', () => {
        const listenable = makeListenable([]);
        let mutationCount = 0;
        listenable.asObservable().subscribe(() => mutationCount++);

        class TestFuncs {
            @Transaction()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
                throw new Error('test error');
            }
        }

        expect(() => TestFuncs.pushABunchOfStuffToAList(listenable)).throws();
        expect(listenable.length).equals(0);
    });

    it('should not rollback changes when an error occurs when using a BatchOperation', () => {
        const listenable = makeListenable([]);
        let mutationCount = 0;
        listenable.asObservable().subscribe(() => mutationCount++);

        class TestFuncs {
            @BatchOperation()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
                throw new Error('test error');
            }
        }

        expect(() => TestFuncs.pushABunchOfStuffToAList(listenable)).throws();
        expect(listenable.length).equals(100);
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
        installDebugHooks();
        const listenable = makeListenable([]);
        let lastMutation: DebuggableMutation<any>;
        listenable.listen().subscribe((mutation) => {
            lastMutation = mutation as DebuggableMutation<any>;
        });

        class TestFuncs {
            @Transaction()
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(lastMutation.batchStack.length).eqls(1);
        expect(lastMutation.batchStack[0]).eqls('pushABunchOfStuffToAList');
    });

    it('can accept explicit transaction names', () => {
        installDebugHooks();
        const listenable = makeListenable([]);
        let lastMutation: DebuggableMutation<any>;
        listenable.listen().subscribe((mutation) => {
            lastMutation = mutation as DebuggableMutation<any>;
        });

        class TestFuncs {
            @Transaction('TestFuncs: Bulk Add')
            static pushABunchOfStuffToAList(list: Array<number>) {
                for (let i = 0; i < 100; i++) {
                    list.push(i);
                }
            }
        }

        TestFuncs.pushABunchOfStuffToAList(listenable);
        expect(lastMutation.batchStack.length).eqls(1);
        expect(lastMutation.batchStack[0]).eqls('TestFuncs: Bulk Add');
    });

    it('works as a function call, in addition to the decorator', () => {
        installDebugHooks();
        const listenable = makeListenable([]);
        let lastMutation: DebuggableMutation<any>;
        listenable.listen().subscribe((mutation) => {
            lastMutation = mutation as DebuggableMutation<any>;
        });

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
        expect(lastMutation.batchStack.length).eqls(1);
        expect(lastMutation.batchStack[0]).eqls('BulkAdd');
    });

    it('blocks mutations outside of batches in strict mode', () => {
        try {
            const listenableArray = makeListenable([]);
            EpoxyGlobalState.strictBatchingMode = true;
            expect(() => listenableArray.push('fail')).throws();
            expect(() => listenableArray.splice(0, 0, 'alsofail')).throws();
            expect(() => listenableArray[0] = 'no').throws();

            const listenableObject = makeListenable({});
            expect(() => listenableObject['a'] = 'a').throws();
            expect(() => delete listenableObject['a']).throws();
        } finally {
            EpoxyGlobalState.strictBatchingMode = false;
        }
    });

    it('allows mutations inside batches in strict mode', () => {
        installDebugHooks();
        try {
            const listenable = makeListenable([]);
            EpoxyGlobalState.strictBatchingMode = true;
            let lastMutation: DebuggableMutation<any>;
            listenable.listen().subscribe((mutation) => {
                lastMutation = mutation as DebuggableMutation<any>;
            });

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
            expect(lastMutation.batchStack.length).eqls(1);
            expect(lastMutation.batchStack[0]).eqls('BulkAdd');
        } finally {
            EpoxyGlobalState.strictBatchingMode = false;
        }
    });

    it('should handle inner errors in nested transactions', () => {
        const listenable = makeListenable({});
        const mutations = [];
        listenable.listen().subscribe(mutations.push.bind(mutations));

        class TestFuncs {
            @Transaction()
            static outerTransaction() {
                listenable['outerProperty'] = 2;
                try {
                    TestFuncs.innerTransaction();
                } catch (e) {}
                listenable['outerProperty2'] = 4;
            }

            @Transaction()
            static innerTransaction() {
                listenable['innerProperty'] = 3;
                throw new Error('test error');
            }
        }

        TestFuncs.outerTransaction();
        expect(listenable['outerProperty']).eqls(2);
        expect(listenable['outerProperty2']).eqls(4);
        expect(listenable['innerProperty']).eqls(undefined);
    });

    it('should handle outer errors in nested transactions', () => {
        const listenable = makeListenable({});
        const mutations = [];
        listenable.listen().subscribe(mutations.push.bind(mutations));

        class TestFuncs {
            @Transaction()
            static outerTransaction() {
                listenable['outerProperty'] = 2;
                try {
                    TestFuncs.innerTransaction();
                } catch (e) {}
                listenable['outerProperty2'] = 4;
                throw new Error('test error');
            }

            @Transaction()
            static innerTransaction() {
                listenable['innerProperty'] = 3;
            }
        }

        expect(() => TestFuncs.outerTransaction()).throws();
        expect(listenable['outerProperty']).eqls(undefined);
        expect(listenable['outerProperty2']).eqls(undefined);
        expect(listenable['innerProperty']).eqls(undefined);
    });
});