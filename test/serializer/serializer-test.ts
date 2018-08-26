import { makeListenable, asActor, computed, Mutation, ArraySpliceMutation } from '../../epoxy';
import { encode, decode, installSerializerExtension, installCoreExtensions, resetSerializerExtensions } from '../../serializer'
import { expect } from 'chai';
import 'mocha';

describe('Serializer', () => {

    beforeEach(() => {
        resetSerializerExtensions();
        installCoreExtensions();
    });

    it('encodes and decodes numbers', () => {
        const serialized = encode(3.14);
        expect(serialized).eqls('_:3.14');
        expect(decode(serialized)).eqls(3.14);
    });

    it('encodes and decodes booleans', () => {
        const serialized = encode(true);
        expect(serialized).eqls('_:true');
        expect(decode(serialized)).eqls(true);
    });

    it('encodes and decodes strings', () => {
        const serialized = encode('test');
        expect(serialized).eqls('_:"test"');
        expect(decode(serialized)).eqls('test');
    });

    it('encodes and decodes null', () => {
        const serialized = encode(null);
        expect(serialized).eqls('_n:');
        expect(decode(serialized)).eqls(null);
    });

    it('encodes and decodes undefined', () => {
        const serialized = encode(undefined);
        expect(serialized).eqls('_u:');
        expect(decode(serialized)).eqls(undefined);
    });

    it('encodes and decodes arrays', () => {
        const serialized = encode([1, '1', true]);
        expect(serialized).eqls('_a:"_:1","_:\\"1\\"","_:true"');
        expect(decode(serialized)).eqls([1, '1', true]);
    });

    it('encodes and decodes objects', () => {
        const serialized = encode({a: 1, b: '1', c: false});
        expect(serialized).eqls('_o:"a":"_:1","b":"_:\\"1\\"","c":"_:false"');
        expect(decode(serialized)).eqls({a: 1, b: '1', c: false});
    });

    it('supports extensions', () => {
        installSerializerExtension({
            id: 'test',
            priority: 5,
            test: (data) => data['real'] === 'yes',
            encode: () => '',
            decode: () => {return {real: 'yes'}},
        })

        const serialized = encode({real: 'yes'});
        expect(serialized).eqls('test:');
        expect(decode(serialized)).eqls({real: 'yes'});
    });

    it('uses the matcher function for extensions', () => {
        installSerializerExtension({
            id: 'test2',
            priority: 5,
            test: (data) => data['real'] === 'whee',
            encode: () => '',
            decode: () => {return {real: 'yes'}},
        })

        const serialized = encode({real: 'yes'});
        expect(serialized).eqls('_o:"real":"_:\\"yes\\""');
        expect(decode(serialized)).eqls({real: 'yes'});
    });

    it('respects priority order', () => {
        installSerializerExtension({
            id: 'test3',
            priority: -1,
            test: (data) => data['real'] === 'yes',
            encode: () => '',
            decode: () => {return {real: 'yes'}},
        })

        const serialized = encode({real: 'yes'});
        expect(serialized).eqls('_o:"real":"_:\\"yes\\""');
        expect(decode(serialized)).eqls({real: 'yes'});
    });
});