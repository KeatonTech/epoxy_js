import { Mutation, ArraySpliceMutation, ValueMutation, makeListenable, PropertyMutation, SubpropertyMutation } from '../../epoxy';
import { encode, decode, installSerializerExtension, installCoreExtensions, resetSerializerExtensions } from '../../serializer'
import { DebuggableMutation } from '../../debugger';
import { installMutationExtensions } from '../../src/debugger/mutation_serializer';
import { expect } from 'chai';
import 'mocha';

describe('Debugger Mutation Serializer', () => {

    beforeEach(() => {
        resetSerializerExtensions();
        installCoreExtensions();
        installMutationExtensions();
    });

    it('encodes and decodes value mutations', () => {
        const original = new ValueMutation([1], [2]);
        (original as any as DebuggableMutation<any>).collection = makeListenable([1]);
        const serialized = encode(original);
        expect(serialized).contains('epxy_mv');

        const decoded = decode(serialized) as ValueMutation<any>;
        expect(decoded).instanceof(ValueMutation);
        expect(decoded.id).eqls(original.id);
        expect(decoded.oldValue).eqls(original.oldValue);
        expect(decoded.newValue).eqls(original.newValue);
        expect(decoded['collection']).eqls(original['collection']);
    });

    it('encodes and decodes property mutations', () => {
        const original = new PropertyMutation('key', 1, 2);
        (original as any as DebuggableMutation<any>).collection = makeListenable([2]);
        const serialized = encode(original);
        expect(serialized).contains('epxy_mp');

        const decoded = decode(serialized) as PropertyMutation<any>;
        expect(decoded).instanceof(PropertyMutation);
        expect(decoded.id).eqls(original.id);
        expect(decoded.key).eqls(original.key);
        expect(decoded.oldValue).eqls(original.oldValue);
        expect(decoded.newValue).eqls(original.newValue);
        expect(decoded['collection']).eqls(original['collection']);
    });

    it('encodes and decodes subproperty mutations', () => {
        const original = new SubpropertyMutation('outer', new PropertyMutation('inner', null, 1));
        (original as any as DebuggableMutation<any>).collection = makeListenable([2]);
        const serialized = encode(original);
        expect(serialized).contains('epxy_ms');

        const decoded = decode(serialized) as SubpropertyMutation<any>;
        expect(decoded).instanceof(SubpropertyMutation);
        expect(decoded.id).eqls(original.id);
        expect(decoded.key).eqls(original.key);
        expect(decoded.mutation).eqls(original.mutation);
        expect(decoded['collection']).eqls(original['collection']);
    });

    it('encodes and decodes array splice mutations', () => {
        const original = new ArraySpliceMutation(3, [4], [5]);
        (original as any as DebuggableMutation<any>).collection = makeListenable([2]);
        const serialized = encode(original);
        expect(serialized).contains('epxy_ma');

        const decoded = decode(serialized) as ArraySpliceMutation<any>;
        expect(decoded).instanceof(ArraySpliceMutation);
        expect(decoded.id).eqls(original.id);
        expect(decoded.key).eqls(original.key);
        expect(decoded.inserted).eqls(original.inserted);
        expect(decoded.deleted).eqls(original.deleted);
        expect(decoded['collection']).eqls(original['collection']);
    });
});