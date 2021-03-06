import {computed} from '../../epoxy';
import { DomGlobalState } from './dom-global';

/**
 * Attaches the result of a listenable computation to a specified attribute of an Element.
 */
export function bindAttribute(element: Element, attribute: string, compute: ()=>any) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.setAttribute(attribute, val)));
}

/**
 * Attaches the result of a listenable computation to a specified CSS style of an Element.
 */
export function bindStyle(element: HTMLElement, property: string, compute: ()=>string) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.style[property] = val));
}

/**
 * Attaches the result of a listenable computation to the HTML content of an element.
 * This should be used sparingly as it can easily be exploited for XSS vulnerabilities.
 */
export function bindInnerHTML(element: Element, compute: ()=>string) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.innerHTML = val));
}

/**
 * Attaches the result of a listenable computation to the presence of a given class on an
 * Element. When the computation evaluates to true, the class will be present on the
 * element, and likewise will be excluded when the computation evaluates to false.
 */
export function bindClass(element: Element, className: string, compute: ()=>boolean) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute).subscribe((present) => {
            if (present) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        }));
}