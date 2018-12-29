import {computed} from '../../epoxy';
import { DomGlobalState } from './dom-global';

/**
 * Attaches the result of a listenable computation to a specified attribute of an HTMLElement.
 */
export function bindAttribute(element: HTMLElement, attribute: string, compute: ()=>any) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.setAttribute(attribute, val)));
}

/**
 * Attaches the result of a listenable computation to a specified attribute of an HTMLElement.
 */
export function bindStyle(element: HTMLElement, property: string, compute: ()=>string) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.style[property] = val));
}

/**
 * Attaches the result of a listenable computation to a specified attribute of an HTMLElement.
 */
export function bindInnerHtml(element: HTMLElement, property: string, compute: ()=>string) {
    DomGlobalState.addSubscriptionOnElement(
        element,
        computed(compute)
            .subscribe((val) => element.innerHTML = val));
}