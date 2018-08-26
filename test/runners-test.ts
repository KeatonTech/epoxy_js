import { computed, observe, autorun, autorunTree, makeListenable, optionallyComputed } from '../epoxy';
import { expect } from 'chai';
import { last } from 'rxjs/operators';
import 'mocha';

describe('Function runners', () => {
    it('should re-run the function whenever a dependency value changes', () => {
        const state = makeListenable({
            value: 4,
        });

        let lastStateValue: number;
        let runCount = 0;
        autorun(() => {
            lastStateValue = state.value;
            runCount++;
        })

        expect(runCount).eqls(1);
        expect(lastStateValue).eqls(4);

        state.value = 5;
        expect(runCount).eqls(2);
        expect(lastStateValue).eqls(5);
    });

    it('should observe individual values', () => {
        const state = makeListenable({
            value: 4,
        });

        const stream = observe(() => state.value);
        
        let lastValue: number;
        stream.subscribe((value) => lastValue = value);
        expect(lastValue).eqls(4);

        state.value = -1;
        expect(lastValue).eqls(-1);
    });

    it('should error when no Epoxy values are passed', () => {
        expect(() => observe(() => 4)).throws();
    });

    it('should observe individual values', () => {
        const state = makeListenable({
            a: 1,
            b: 2,
        });

        expect(() => observe(() => state.a + state.b)).throws();
    });

    it('should compute values derived from multiple epoxy values', () => {
        const state = makeListenable({
            a: 1,
            b: 2,
        });

        const sum = computed(() => state.a + state.b);
        let lastSum: number;
        sum.subscribe((newValue) => lastSum = newValue);
        expect(lastSum).equals(3);
        
        state.a = 2;
        expect(lastSum).equals(4);
    });

    it('should compute values derived from an epoxy array', () => {
        const numbers = makeListenable([1, 2, 3, 4]);

        const sum = computed(() => numbers.reduce((i, a) => i + a));
        let lastSum: number;
        sum.subscribe((newValue) => lastSum = newValue);
        expect(lastSum).equals(10);
        
        numbers.push(5);
        expect(lastSum).equals(15);
        
        numbers.splice(0, 1);
        expect(lastSum).equals(14);

        numbers[0] = 0;
        expect(lastSum).equals(12);
    });

    it('should not compute values from a non-epoxy array', () => {
        const numbers = [1, 2, 3, 4];

        const sum = optionallyComputed(() => numbers.reduce((i, a) => i + a));
        expect(typeof sum === 'number');
        expect(sum).equals(10);
    });

    it('should unsubscribe from autorun listeners', () => {
        const state = makeListenable({
            value: 4,
        });

        let lastStateValue: number;
        let runCount = 0;
        const unsubscribe = autorun(() => {
            lastStateValue = state.value;
            runCount++;
        })

        expect(runCount).eqls(1);
        expect(lastStateValue).eqls(4);
        unsubscribe();

        state.value = 5;
        expect(runCount).eqls(1);
        expect(lastStateValue).eqls(4);
    });

    it('should nest autorunTree calls', () => {
        const state = makeListenable({
            a: 4,
            b: 5,
        });

        let outerRunCount = 0;
        let innerRunCount = 0;
        autorunTree(() => {
            state.a;
            outerRunCount++;

            autorunTree(() => {
                state.b;
                innerRunCount++;
            });
        });

        state.a++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(2);

        state.b++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(3);
    });

    it('should cancel inner autorunTrees when outer ones are cancelled', () => {
        const state = makeListenable({
            a: 4,
            b: 5,
        });

        let outerRunCount = 0;
        let innerRunCount = 0;
        const unsubscribe = autorunTree(() => {
            state.a;
            outerRunCount++;

            autorunTree(() => {
                state.b;
                innerRunCount++;
            });
        });

        state.a++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(2);
        unsubscribe();

        state.b++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(2);
    });

    it('can cancel inner autorunTrees without cancelling outer ones', () => {
        const state = makeListenable({
            a: 4,
            b: 5,
        });

        let outerRunCount = 0;
        let innerRunCount = 0;
        let unsubscribeInner;

        autorunTree(() => {
            state.a;
            outerRunCount++;

            unsubscribeInner = autorunTree(() => {
                state.b;
                innerRunCount++;
            });
        });

        state.a++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(2);
        unsubscribeInner();

        state.b++;
        expect(outerRunCount).eqls(2);
        expect(innerRunCount).eqls(2);

        state.a++;
        expect(outerRunCount).eqls(3);
        expect(innerRunCount).eqls(3);
    });
});