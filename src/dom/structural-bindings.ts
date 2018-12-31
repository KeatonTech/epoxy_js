import {Listenable, ArraySpliceMutation, PropertyMutation, ValueMutation } from '../../epoxy';
import {listenableMap} from '../../operators';
import { DomGlobalState } from './dom-global';
import { Observable } from 'rxjs';

/**
 * Creates children for a given element as dictated by a listenable array. Adding items to the
 * array will add children, removing them will remove children, and re-ordering them will
 * re-order the children. Note that this will overwrite any existing children on the element.
 */
export function appendChildrenFor<T>(
    element: HTMLElement,           // Element whose children to replace
    list: Listenable<Array<T>>,     // Listenable list that will drive the binding
    render: (T)=>HTMLElement        // Function that creates elements
) {

    // Create a listenable list of HTML elements that can be directly applied to the
    // children of this element. 
    appendBoundChildren(element, listenableMap(
        list,
        render, 
        false /** Disable computed() on the map function  */,
        true /** Ignore subproperty mutations; bindings will take care of it */));
}

export function appendBoundChildren(
    element: HTMLElement,                   // Element whose children to replace
    list: Listenable<Array<HTMLElement>>,   // Listenable list that will drive the binding
) {
    // Initial render
    for (const child of list) {
        element.appendChild(child);
    }

    // Add a comment signifying the end of the loop area
    const insertionPlaceholder = document.createComment('');
    element.appendChild(insertionPlaceholder);

    // Watch for mutations
    DomGlobalState.addSubscriptionOnElement(
        element,
        list.listen().subscribe((mutation) => {
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
                        element.insertBefore(mutation.inserted[i], insertionPlaceholder);
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
                for (const child of list) {
                    element.insertBefore(child, insertionPlaceholder);
                }
            }
        }));
}

/**
 * Adds a single child element bound to a single HTMLElement as an observable.
 */
export function appendBoundChild(
    element: HTMLElement,
    child$: Observable<HTMLElement|undefined>,
) {
    // Add a comment signifying the insertion point for the bound element.
    const insertionPlaceholder = document.createComment('');
    element.appendChild(insertionPlaceholder);

    // Stores the last value of the observable.
    let lastChild = undefined;

    // Watch for changes
    DomGlobalState.addSubscriptionOnElement(
        element,
        child$.subscribe((childElement) => {
            if (lastChild !== undefined) {
                DomGlobalState.removeElement(lastChild);
                element.removeChild(lastChild);
            }

            if (childElement !== undefined) {
                element.insertBefore(childElement, insertionPlaceholder);
            }

            lastChild = childElement;
        }));
}