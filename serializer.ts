import {installCoreExtensions} from './src/serializer/extensions/core';
installCoreExtensions();

export {installSerializerExtension, resetSerializerExtensions} from './src/serializer/extensions';
export {encode, decode} from './src/serializer/serializer';
export {SerializerExtension} from './src/serializer/types';
export {installCoreExtensions} from './src/serializer/extensions/core';