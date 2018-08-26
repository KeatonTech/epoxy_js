import { makeListenable, asActor, computed, Mutation, ArraySpliceMutation } from '../epoxy';
import { expect } from 'chai';
import 'mocha';

describe('Actors', () => {
    it('should not receive direct property changes caused by the actor itself', () => {
        const listenable = makeListenable([]);
        const listenableActor = asActor('test', listenable);

        let mutationCount = 0;
        let lastMutation: Mutation<any>;
        listenableActor.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        listenable.push(1);
        expect(mutationCount).eqls(1);
        expect(lastMutation).instanceof(ArraySpliceMutation);

        listenableActor[0] = 2;
        expect(mutationCount).eqls(1);
        expect(listenableActor).eqls([2]);
    });

    it('should not receive property changes caused by functions on the actor', () => {
        const listenable = makeListenable([]);
        const listenableActor = asActor('test', listenable);

        let mutationCount = 0;
        let lastMutation: Mutation<any>;
        listenableActor.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        listenable.push(1);
        expect(mutationCount).eqls(1);
        expect(lastMutation).instanceof(ArraySpliceMutation);

        listenableActor.push(2)
        expect(mutationCount).eqls(1);
        expect(listenableActor).eqls([1, 2]);
    });

    it('asObservable should not update for changes caused by the actor itself', () => {
        const listenable = makeListenable([]);
        const listenableActor = asActor('test', listenable);

        let mutationCount = 0;
        let lastList: number[];
        listenableActor.asObservable().subscribe((list) => {
            mutationCount++;
            lastList = list;
        });

        listenable.push(1);
        expect(mutationCount).eqls(1);
        expect(lastList).eqls([1])

        listenableActor[0] = 2;
        expect(mutationCount).eqls(1);
        expect(lastList).eqls([1]);
        expect(listenableActor).eqls([2]);
    });

    it('observables() should not update for changes caused by the actor itself', () => {
        const listenable = makeListenable([1]);
        const listenableActor = asActor('test', listenable);

        let mutationCount = 0;
        listenableActor.observables()[0].subscribe((list) => {
            mutationCount++;
        });
        expect(mutationCount).eqls(1);

        listenable[0] = 2;
        expect(mutationCount).eqls(2);

        listenableActor[0] = 3;
        expect(mutationCount).eqls(2);
        expect(listenableActor).eqls([3]);
    });

    it('observables() should work with nested collections', () => {
        const listenable = makeListenable([{value: 1}]);
        const listenableActor = asActor('test', listenable);

        let mutationCount = 0;
        listenableActor.observables()[0].subscribe((list) => {
            mutationCount++;
        });
        expect(mutationCount).eqls(1);

        listenable[0].value = 2;
        expect(mutationCount).eqls(2);

        listenableActor[0].value = 3;
        expect(mutationCount).eqls(2);
        expect(listenableActor).eqls([{value: 3}]);
    });

    it('computed properties work with actors', () => {
        const listenable = makeListenable([1, 2]);
        const listenableActor = asActor('test', listenable);
        const sum = computed(() => listenableActor[0] + listenableActor[1]);

        let computeCount = 0;
        let lastSum;
        sum.subscribe((sum) => {
            computeCount++;
            lastSum = sum;
        });
        expect(computeCount).eqls(1);

        listenable[0] = 2;
        expect(computeCount).eqls(2);
        expect(lastSum).eqls(4);

        listenableActor[1] = 3;
        expect(computeCount).eqls(3);
        expect(lastSum).eqls(5);
    });
});