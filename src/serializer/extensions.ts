import {SerializerExtension} from './types';

export const installedSerializerExtensions: SerializerExtension[] = [];
export const installedExtensionsById: {[id: string]: SerializerExtension} = {};

/**
 * Installs a new serializer extension, which allows this serializer to support data types
 * not supported by JSON.
 */
export function installSerializerExtension(extension: SerializerExtension) {
    if (extension.id.indexOf(':') !== -1) {
        throw new Error('Extension ids cannot contain the ":" character');
    }

    let insertionIndex = installedSerializerExtensions.findIndex((existing) => {
        return existing.priority < extension.priority;
    });
    if (insertionIndex > -1) {
        installedSerializerExtensions.splice(insertionIndex, 0, extension);
    } else {
        installedSerializerExtensions.push(extension);
    }

    if (installedExtensionsById[extension.id] !== undefined) {
        if (installedExtensionsById[extension.id].priority >= extension.priority) {
            return;
        }
    }
    installedExtensionsById[extension.id] = extension;
}

/** Removes all installed extensions. Used for testing. */
export function resetSerializerExtensions() {
    installedSerializerExtensions.splice(0, installedSerializerExtensions.length);
    for (let key in installedExtensionsById) {
        if (installedExtensionsById.hasOwnProperty(key)) {
            delete installedExtensionsById[key];
        }
    }
}