import {makeListenable, Mutation, ArraySpliceMutation, SubpropertyMutation, computed, PropertyMutation, ValueMutation, ListenableSignifier, ListenableObject, MakeListenable} from '../epoxy';
import { expect } from 'chai';
import { last } from 'rxjs/operators';
import { ReadonlyException } from '../src/readonly-proxy';
import 'mocha';

describe('Object Models', () => {
    it('should make a listenable object when constructed', () => {
        class TestModel extends ListenableObject {
            public count: number;
        }

        const testModel = new TestModel();
        expect(testModel[ListenableSignifier]).not.undefined;
    });

    it('should change the \'this\' value to point to the listenable copy', () => {

        class TestModel extends ListenableObject {
            public count = 0;

            public increment() {
                this.count++;
            }
        }

        const testModel = new TestModel();
        let caughtMutation = false;
        testModel.listen().subscribe((mutation) => {
            if (!(mutation instanceof PropertyMutation)) {
                throw new Error('Expected PropertyMutation');
            }
            expect(mutation.key).eqls('count');
            expect(mutation.newValue).eqls(1);
            caughtMutation = true;
        });

        testModel.increment();
        expect(caughtMutation).eqls(true);
    });

    it('should work with inheritance', () => {

        let ranBaseConstructor = false;
        class BaseClass {
            constructor(
                public property: string
            ) {
                ranBaseConstructor = true;
            }
        }
        
        class TestModel extends MakeListenable(BaseClass) {
            public count = 0;

            public increment() {
                this.count++;
            }
        }

        const testModel = new TestModel('test');
        const mutations = [];
        testModel.listen().subscribe(mutations.push.bind(mutations));

        testModel.increment();
        expect(mutations.length).eqls(1);

        testModel.property = 'another';
        expect(mutations.length).eqls(2);

        expect(ranBaseConstructor).eqls(true);
    });
});