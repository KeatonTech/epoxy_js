import {installCoreExtensions} from './src/serializer/extensions/core';
installCoreExtensions();

import {installMutationExtensions} from './src/serializer/extensions/mutations';
installMutationExtensions();

export {installSerializerExtension, resetSerializerExtensions} from './src/serializer/extensions';
export {encode, decode} from './src/serializer/serializer';
export {SerializerExtension} from './src/serializer/types';
export {installCoreExtensions} from './src/serializer/extensions/core';