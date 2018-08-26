import { makeListenable, Mutation, ArraySpliceMutation, runTransaction } from '../../epoxy'
import { runWithDebugger, BatchOperationDebugEvent } from '../../debugger';
import { expect } from 'chai';
import 'mocha';

describe('Debugger Mutation Tracking', () => {
    it('tracks mutations on an unlabeled array', () => {
        runWithDebugger((debug) => {
            const array = makeListenable([]);
            expect(debug.mutations.length).eqls(0);
    
            array.push(1);
            expect(debug.mutations.length).eqls(1);
            expect(debug.mutations[0].batchStack.length).eqls(0);
            expect(debug.mutations[0].collection).eqls(array);
            expect(debug.mutations[0].mutation).instanceof(ArraySpliceMutation);
        });
    });

    it('tracks mutations on a labeled array', () => {
        runWithDebugger((debug) => {
            const array = makeListenable([]);
            array.debugWithLabel('list');
            expect(debug.mutations.length).eqls(0);
    
            array.push(1);
            expect(debug.mutations.length).eqls(1);
            expect(debug.mutations[0].batchStack.length).eqls(0);
            expect(debug.mutations[0].collection).eqls(array);
            expect(debug.mutations[0].mutation).instanceof(ArraySpliceMutation);

            expect(debug.collections.length).eqls(1);
            expect(debug.collections[0].label).eqls('list');
            expect(debug.collections[0].collection).eqls(array);
            expect(debug.collections[0].mutations.length).eqls(1);
            expect(debug.collections[0].mutations[0].mutation).instanceof(ArraySpliceMutation);
        });
    });

    it('tracks batch operations', () => {
        runWithDebugger((debug) => {
            const array = makeListenable([]);
            expect(debug.mutations.length).eqls(0);
    
            runTransaction('push', () => {
                array.push(1);
            });

            expect(debug.events.length).eqls(1);
            expect(debug.events[0]).instanceof(BatchOperationDebugEvent);
            const batchEvent = debug.events[0] as BatchOperationDebugEvent<any>;
            expect(batchEvent.batchStack).eqls([]);
            expect(batchEvent.batch.name).eqls('push');
            expect(batchEvent.mutationEvents.length).eqls(1);
            expect(batchEvent.mutationEvents[0].mutation).instanceof(ArraySpliceMutation);
            expect(batchEvent.childEvents.length).eqls(0);
        });
    });

    it('tracks nested batch operations', () => {
        runWithDebugger((debug) => {
            const array = makeListenable([]);
            expect(debug.mutations.length).eqls(0);
    
            runTransaction('push', () => {
                array.push(1);
                runTransaction('inner1', () => {
                    array.push(2);
                });
                runTransaction('inner1', () => {
                    array.push(3);
                });
            });

            expect(debug.mutations.length).eqls(3);
            expect(debug.events.length).eqls(1);
            expect(debug.events[0]).instanceof(BatchOperationDebugEvent);
            const batchEvent = debug.events[0] as BatchOperationDebugEvent<any>;
            expect(batchEvent.batchStack).eqls([]);
            expect(batchEvent.batch.name).eqls('push');
            expect(batchEvent.childEvents.length).eqls(2);
            expect(batchEvent.childEvents[0].batch.name).eqls('inner1');
            expect(batchEvent.childEvents[1].batch.name).eqls('inner1');
        });
    });
});