import { SerializerExtension, encode, decode, installSerializerExtension } from '../../serializer';
import { ArraySpliceMutation, Mutation, ValueMutation, PropertyMutation, SubpropertyMutation } from "../../epoxy";
import { DebuggableMutation } from '../debugger/model';

/** Helper function for encoding debug data with the mutation */
function appendDebugData(mutation: Mutation<any>, toEncode: any[]) {
    const debugMutation = mutation as DebuggableMutation<any>;
    if (debugMutation.collection) {
        toEncode.push([
            debugMutation.batchStack,
            debugMutation.collection,
            debugMutation.state,
            debugMutation.derivedFrom,
            debugMutation.overwrittenBy,
            debugMutation.combinedInto,
        ]);
    }
}

/** Helper function for extracting debug data with the mutation */
function extractDebugData(mutation: Mutation<any>, data: any[]) {
    const debugArray = data[data.length - 1];
    const debugMutation = mutation as DebuggableMutation<any>;
    debugMutation.batchStack = debugArray[0];
    debugMutation.collection = debugArray[1];
    debugMutation.state = debugArray[2];
    debugMutation.derivedFrom = debugArray[3];
    debugMutation.overwrittenBy = debugArray[4];
    debugMutation.combinedInto = debugArray[5];
}

/** Encodes ValueMutation objects */
const EpoxyValueMutationSerializer: SerializerExtension = {
    id: 'epxy_mv',
    priority: 90,
    test: (data) => data instanceof ValueMutation,

    encode: (data) => {
        const mutation = data as ValueMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            encode(mutation.oldValue),
            encode(mutation.newValue),
        ];
        appendDebugData(mutation, toEncode);
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new ValueMutation(decode(data[2]), decode(data[3]));
        ret.id = data[0];
        ret.createdBy = data[1];
        if (data.length === 5) {
            extractDebugData(ret, data);
        }
        return ret;
    },
};

/** Encodes PropertyMutation objects */
const EpoxyPropertyMutationSerializer: SerializerExtension = {
    id: 'epxy_mp',
    priority: 90,
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
        appendDebugData(mutation, toEncode);
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new PropertyMutation(data[2], decode(data[3]), decode(data[4]));
        ret.id = data[0];
        ret.createdBy = data[1];
        if (data.length === 6) {
            extractDebugData(ret, data);
        }
        return ret;
    },
};

/** Encodes SubpropertyMutation objects */
const EpoxySubpropertyMutationSerializer: SerializerExtension = {
    id: 'epxy_ms',
    priority: 90,
    test: (data) => data instanceof SubpropertyMutation,

    encode: (data) => {
        const mutation = data as SubpropertyMutation<any>;
        const toEncode = [
            mutation.id,
            mutation.createdBy,
            mutation.key,
            encode(mutation.mutation),
        ];
        appendDebugData(mutation, toEncode);
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new SubpropertyMutation(data[2], decode(data[3]));
        ret.id = data[0];
        ret.createdBy = data[1];
        if (data.length === 5) {
            extractDebugData(ret, data);
        }
        return ret;
    },
};

/** Encodes ListSpliceMutation objects */
const EpoxyArraySpliceMutationSerializer: SerializerExtension = {
    id: 'epxy_ma',
    priority: 90,
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
        appendDebugData(mutation, toEncode);
        return JSON.stringify(toEncode);
    },

    decode: (encoded) => {
        const data = JSON.parse(encoded);
        const ret = new ArraySpliceMutation(data[2], decode(data[3]), decode(data[4]));
        ret.id = data[0];
        ret.createdBy = data[1];
        if (data.length === 6) {
            extractDebugData(ret, data);
        }
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