export { IListenableArray, IListenableObject } from './src/types';
export * from './src/mutations';

export { makeListenable } from './src/make-listenable';
export { computed } from './src/runners';

import { EpoxyGlobalState } from './src/global-state';
export const DebugData = EpoxyGlobalState.DebugData;