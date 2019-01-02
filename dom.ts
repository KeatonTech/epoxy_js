export * from './src/dom/structural-bindings';
export * from './src/dom/simple-bindings';
export * from './src/dom/dom-element';
export * from './src/dom/dom-component';

import {DomGlobalState} from './src/dom/dom-global';
export const removeElement = DomGlobalState.removeElement;