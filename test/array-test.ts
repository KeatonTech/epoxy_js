import {makeListenable, Mutation, ArraySpliceMutation, SubpropertyMutation, computed, ReadonlyException, PropertyMutation, IListenableArray, ValueMutation} from '../epoxy';
import { expect } from 'chai';
import { last, reduce } from 'rxjs/operators';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
// import mocha

describe('Array Watcher', () => {

    it('can be initialized with observables', () => {
        const valueSubject = new BehaviorSubject(1);
        const listenableArray = makeListenable([valueSubject.asObservable()]);
        expect(listenableArray).eqls([1]);


        let lastMutation: Mutation<string>;
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        valueSubject.next(2);
        expect(listenableArray).eqls([2]);
        expect(lastMutation instanceof PropertyMutation).true;
        expect((lastMutation as PropertyMutation<number>).key).equals(0);
        expect((lastMutation as PropertyMutation<number>).oldValue).equals(1);
        expect((lastMutation as PropertyMutation<number>).newValue).equals(2);
    });

    it('can be initialized with observables that resolve out of order', () => {
        const valueSubject1 = new Subject();
        const valueSubject2 = new BehaviorSubject(2);
        const listenableArray = makeListenable([
            valueSubject1.asObservable(),
            valueSubject2.asObservable()
        ]);
        expect(listenableArray[0] instanceof Observable).true;
        expect(listenableArray[1]).eqls(2);


        let lastMutation: Mutation<string>;
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        valueSubject1.next(1);
        expect(listenableArray).eqls([1, 2]);
    });

    it('should trigger an ArraySpliceMutation on the push() function', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray.push('hey');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hey']);
        }
        
        listenableArray.push('hi');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(1);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hi']);
        }
    });

    it('should trigger an ArraySpliceMutation on the splice() function', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray.splice(0, 0, 'hey', 'how', 'are', 'you?');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hey', 'how', 'are', 'you?']);
        }
        
        listenableArray.splice(2, 1);
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(2);
            expect(lastMutation.deleted).eql(['are']);
            expect(lastMutation.inserted).eql([]);
        }
    });

    it('should trigger a PropertyMutation when a value is set', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([1, 1]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray[1] = 2;
        expect(lastMutation).instanceof(PropertyMutation);
        if (lastMutation instanceof PropertyMutation) {
            expect(lastMutation.key).equals(1);
            expect(lastMutation.oldValue).equals(1);
            expect(lastMutation.newValue).equals(2);
        }
    });

    it('should listen to changes in child arrays', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([[1, 2, 3]]);
        listenableArray.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray[0].push(4);
        expect(lastMutation).instanceof(SubpropertyMutation);
        if (lastMutation instanceof SubpropertyMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.mutation).instanceof(ArraySpliceMutation);
            expect(lastMutation.mutation.key).equals(3);
        }
    });

    it('should create property observables', () => {
        const listenableArray = makeListenable([1, 1]);
        const values = [];
        listenableArray.observables()[0].subscribe((newVal) => values.push(newVal));

        expect(values.length).equals(1);
        expect(values[0]).equals(1);

        listenableArray[0] = 10;
        listenableArray[1] = -10;
        expect(values.length).equals(2);
        expect(values[1]).equals(10);
    });

    it('should work with computed properties', () => {
        const listenableArray = makeListenable([1, 1]);
        const sum = computed(() => listenableArray[0] + listenableArray[1]);

        const sumValues = [];
        sum.subscribe((newSum) => sumValues.push(newSum));

        expect(sumValues.length).equals(1);
        expect(sumValues[0]).equals(2);

        listenableArray[0] = 2;
        expect(sumValues.length).equals(2);
        expect(sumValues[1]).equals(3);

        listenableArray[1] = -2;
        expect(sumValues.length).equals(3);
        expect(sumValues[2]).equals(0);

        listenableArray.splice(0, 0, 20);
        expect(sumValues.length).equals(4);
        expect(sumValues[3]).equals(22);
    });

    it('should be able to apply mutations', () => {
        const listenableArray = makeListenable([1, 1]);
        
        listenableArray.applyMutation(new PropertyMutation(0, 1, 2));
        expect(listenableArray).eql([2, 1]);
        
        listenableArray.applyMutation(new ArraySpliceMutation(0, [2], []));
        expect(listenableArray).eql([1]);
        
        listenableArray.applyMutation(new ArraySpliceMutation(0, [], [0]));
        expect(listenableArray).eql([0, 1]);

        const deepListenableArray = makeListenable([[0, 1], [2, 3]]);
        deepListenableArray.applyMutation(new SubpropertyMutation(0, new PropertyMutation(1, 1, -1)));
        expect(deepListenableArray).eql([[0, -1], [2, 3]]);
    });

    it('should be able to un-apply mutations', () => {
        const listenableArray = makeListenable([2, 1]);
        
        listenableArray.unapplyMutation(new PropertyMutation(0, 1, 2));
        expect(listenableArray).eql([1, 1]);
        
        listenableArray.unapplyMutation(new ArraySpliceMutation(0, [2], []));
        expect(listenableArray).eql([2, 1, 1]);
        
        listenableArray.unapplyMutation(new ArraySpliceMutation(1, [], [1]));
        expect(listenableArray).eql([2, 1]);

        const deepListenableArray = makeListenable([[0, -1], [2, 3]]);
        deepListenableArray.unapplyMutation(new SubpropertyMutation(0, new PropertyMutation(1, 1, -1)));
        expect(deepListenableArray).eql([[0, 1], [2, 3]]);
    });

    it('can generate a reactive fibonnaci sequence', () => {
        const fibonnaci = makeListenable([1, 1]) as IListenableArray<any>;
        for (let i = 0; i < 10; i++) {
            const n = i; // Make a new variable for each iteration.
            fibonnaci.push(computed(() => fibonnaci[n] + fibonnaci[n + 1]));
        }

        expect(fibonnaci).eql([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);

        fibonnaci[0] = 0;
        expect(fibonnaci).eql([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);

        fibonnaci[1] = 0;
        expect(fibonnaci).eql([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('can create a readonly copy', () => {
        const numbers = makeListenable([1, 2, 3, 4]);
        const readonly = numbers.asReadonly();

        expect(() => readonly[0] = 2).throws(ReadonlyException);
        expect(() => readonly.push(5)).throws(ReadonlyException);
        expect(() => delete readonly[1]).throws(ReadonlyException);
        expect(() => readonly.applyMutation(new ValueMutation(1, 2))).throws(ReadonlyException);
    });

    it('the readonly copy keeps up with mutations to the original', () => {
        let lastMutation: Mutation<string>;
        const listenableArray = makeListenable([]);
        const readonly = listenableArray.asReadonly();
        readonly.listen().subscribe((mutation) => lastMutation = mutation);

        listenableArray.push('hey');
        expect(lastMutation).instanceof(ArraySpliceMutation);
        if (lastMutation instanceof ArraySpliceMutation) {
            expect(lastMutation.key).equals(0);
            expect(lastMutation.deleted).eql([]);
            expect(lastMutation.inserted).eql(['hey']);
        }
    });

    it('can create computed reducers', () => {
        const numbers = makeListenable([100, 10, 1]);
        const sum = computed(() => numbers.reduce((a, i) => a + i));

        let lastSumValue: number;
        sum.subscribe((val) => lastSumValue = val);
        expect(lastSumValue).equals(111);

        numbers.push(1000);
        expect(lastSumValue).equals(1111);
    });

    it('supports the fill() operation', () => {
        const listenableArray = makeListenable([1, 2, 3, 4, 5]);

        let lastMutation: Mutation<string>;
        let mutationCount = 0;
        listenableArray.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        listenableArray.fill(0);
        expect(mutationCount).equals(5);
        expect(lastMutation).instanceof(PropertyMutation);
    });

    it('supports the pop() operation', () => {
        const listenableArray = makeListenable([1, 2, 3, 4, 5]);

        let lastMutation: Mutation<string>;
        let mutationCount = 0;
        listenableArray.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        expect(listenableArray.pop()).equals(5);
        expect(mutationCount).equals(1);
        expect(lastMutation).instanceof(ArraySpliceMutation);
        expect((lastMutation as ArraySpliceMutation<number>).key).equals(4);
    });

    it('supports the unshift(item) operation', () => {
        const listenableArray = makeListenable([1, 2, 3, 4, 5]);

        let lastMutation: Mutation<string>;
        let mutationCount = 0;
        listenableArray.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        expect(listenableArray.unshift(0)).equals(6);
        expect(listenableArray).eqls([0, 1, 2, 3, 4, 5]);

        expect(mutationCount).equals(1);
        expect(lastMutation).instanceof(ArraySpliceMutation);
        expect((lastMutation as ArraySpliceMutation<number>).key).equals(0);
    });

    it('supports the unshift(item, item) operation', () => {
        const listenableArray = makeListenable([1, 2, 3, 4, 5]);

        let lastMutation: Mutation<string>;
        let mutationCount = 0;
        listenableArray.listen().subscribe((mutation) => {
            mutationCount++;
            lastMutation = mutation;
        });

        expect(listenableArray.unshift(-1, 0)).equals(7);
        expect(listenableArray).eqls([-1, 0, 1, 2, 3, 4, 5]);

        expect(mutationCount).equals(1);
        expect(lastMutation).instanceof(ArraySpliceMutation);
        expect((lastMutation as ArraySpliceMutation<number>).key).equals(0);
    });
});