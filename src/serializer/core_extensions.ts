import { SerializerExtension } from "./types";
import { encode, decode } from "./serializer";
import { installSerializerExtension } from "./extensions";

/** Encodes primitive values using JSON. */
const EpoxyPrimitiveSerializer: SerializerExtension = {
    id: '_',
    priority: Infinity,
    test: (data) => typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string',
    encode: (data) => JSON.stringify(data),
    decode: (encoded) => JSON.parse(encoded),
};

/** Encodes pure arrays recursively using JSON */
const EpoxyArrayObjectSerializer: SerializerExtension  = {
    id: '_a',
    priority: 1,
    test: (data) => data instanceof Array,
    encode: (data) => JSON.stringify((data as Array<any>).map(encode)),
    decode: (encoded) => (JSON.parse(encoded) as Array<any>).map(decode),
};

/** Encodes pure objects recursively using JSON */
const EpoxyDataObjectSerializer: SerializerExtension  = {
    id: '_o',
    priority: 1,

    test: (data) => data.constructor === Object,

    encode: (data) => {
        const encoded = {};
        for (const key in data) {
            if (!data.hasOwnProperty(key)) {
                continue;
            }
            encoded[key] = encode(data[key]);
        }
        return JSON.stringify(encoded);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        for (const key in data) {
            if (!data.hasOwnProperty(key)) {
                continue;
            }
            data[key] = decode(data[key]);
        }
        return data;
    }
};

export function installCoreExtensions() {
    installSerializerExtension(EpoxyPrimitiveSerializer);
    installSerializerExtension(EpoxyDataObjectSerializer);
    installSerializerExtension(EpoxyArrayObjectSerializer);
}