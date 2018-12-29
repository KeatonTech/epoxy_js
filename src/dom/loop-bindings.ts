import {Listenable} from '../../epoxy';
import {listenableMap} from '../../operators';
import { DomGlobalState } from './dom-global';
import { ArraySpliceMutation, PropertyMutation, ValueMutation } from '../mutations';

/**
 * Creates children for a given element as dictated by a listenable array. Adding items to the
 * array will add children, removing them will remove children, and re-ordering them will
 * re-order the children. Note that this will overwrite any existing children on the element.
 */
export function bindChildren<T>(
    element: HTMLElement,           // Element whose children to replace
    list: Listenable<Array<T>>,     // Listenable list that will drive the binding
    mapper: (T)=>HTMLElement        // Function that creates elements
) {
    // Remove any existing children
    element.innerHTML = '';

    // Create a listenable list of HTML elements that can be directly applied to the
    // children of this element.
    const mappedListenable = listenableMap(list, mapper);

    // Initial render
    for (const child of mappedListenable) {
        element.appendChild(child);
    }

    // Watch for mutations
    DomGlobalState.addSubscriptionOnElement(
        element,
        mappedListenable.listen().subscribe((mutation) => {
            if (mutation instanceof ArraySpliceMutation) {
                for (const deleted of mutation.deleted) {
                    DomGlobalState.removeElement(deleted);
                    element.removeChild(deleted);
                }

                const refElement = element.children[(mutation.key as number)];
                for (let i = mutation.inserted.length - 1; i >= 0; i--) {
                    if (refElement) {
                        element.insertBefore(mutation.inserted[i], refElement);
                    } else {
                        element.appendChild(mutation.inserted[i]);
                    }
                }

            } else if (mutation instanceof PropertyMutation) {
                element.insertBefore(mutation.newValue, mutation.oldValue);
                DomGlobalState.removeElement(mutation.oldValue);
                element.removeChild(mutation.oldValue);

            } else if (mutation instanceof ValueMutation) {
                for (const existing of element.children) {
                    DomGlobalState.removeElement(existing);
                }
                element.innerHTML = '';
                for (const child of mappedListenable) {
                    element.appendChild(child);
                }
            }
        }));
}