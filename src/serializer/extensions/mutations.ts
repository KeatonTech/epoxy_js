import { encode, decode } from "../serializer";
import { installSerializerExtension } from "../extensions";
import { SerializerExtension } from "../types";
import { ArraySpliceMutation, Mutation, ValueMutation, PropertyMutation, SubpropertyMutation } from "../../../epoxy";


/** Encodes ValueMutation objects */
const EpoxyValueMutationSerializer: SerializerExtension = {
    id: 'epxy_mv',
    priority: 80,
    test: (data) => data instanceof ValueMutation,

    encode: (data) => {
        const mutation = data as ValueMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            encode(mutation.oldValue),
            encode(mutation.newValue),
        ];
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new ValueMutation(decode(data[2]), decode(data[3]));
        ret.id = data[0];
        ret.createdBy = data[1];
        return ret;
    },
};

/** Encodes PropertyMutation objects */
const EpoxyPropertyMutationSerializer: SerializerExtension = {
    id: 'epxy_mp',
    priority: 80,
    test: (data) => data instanceof PropertyMutation,

    encode: (data) => {
        const mutation = data as PropertyMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            mutation.key,
            encode(mutation.oldValue),
            encode(mutation.newValue),
        ];
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new PropertyMutation(data[2], decode(data[3]), decode(data[4]));
        ret.id = data[0];
        ret.createdBy = data[1];
        return ret;
    },
};

/** Encodes SubpropertyMutation objects */
const EpoxySubpropertyMutationSerializer: SerializerExtension = {
    id: 'epxy_ms',
    priority: 80,
    test: (data) => data instanceof SubpropertyMutation,

    encode: (data) => {
        const mutation = data as SubpropertyMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            mutation.key,
            encode(mutation.mutation),
        ];
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new SubpropertyMutation(data[2], decode(data[3]));
        ret.id = data[0];
        ret.createdBy = data[1];
        return ret;
    },
};

/** Encodes ListSpliceMutation objects */
const EpoxyArraySpliceMutationSerializer: SerializerExtension = {
    id: 'epxy_ma',
    priority: 80,
    test: (data) => data instanceof ArraySpliceMutation,

    encode: (data) => {
        const mutation = data as ArraySpliceMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            mutation.key,
            encode(mutation.deleted),
            encode(mutation.inserted),
        ];
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new ArraySpliceMutation(data[2], decode(data[3]), decode(data[4]));
        ret.id = data[0];
        ret.createdBy = data[1];
        return ret;
    },
};

/** Install the serializer hooks. */
export function installMutationExtensions() {
    installSerializerExtension(EpoxyValueMutationSerializer);
    installSerializerExtension(EpoxyPropertyMutationSerializer);
    installSerializerExtension(EpoxySubpropertyMutationSerializer);
    installSerializerExtension(EpoxyArraySpliceMutationSerializer);
}