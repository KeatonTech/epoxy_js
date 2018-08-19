import {installCoreExtensions} from './src/serializer/core_extensions';
installCoreExtensions();

export {installSerializerExtension, resetSerializerExtensions} from './src/serializer/extensions';
export {encode, decode} from './src/serializer/serializer';
export {SerializerExtension} from './src/serializer/types';
export {installCoreExtensions} from './src/serializer/core_extensions';