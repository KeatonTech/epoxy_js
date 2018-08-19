import {installedSerializerExtensions, installedExtensionsById} from './extensions';

export function encode(data: any) {
    for (const extension of installedSerializerExtensions) {
        try {
            if (extension.test(data)) {
                return extension.id + ":" + extension.encode(data);
            }
        } catch (e) {
            continue;
        }
    }
    throw new Error('Could not encode Epoxy data. No matching extension');
}

export function decode(encoded: string) {
    const splitIndex = encoded.indexOf(':');
    const id = encoded.substr(0, splitIndex);
    const extension = installedExtensionsById[id];
    if (!extension) {
        throw new Error(`Could not decode Epoxy data. Extension ${id} is not installed`);
    }

    return extension.decode(encoded.substr(splitIndex + 1));
}