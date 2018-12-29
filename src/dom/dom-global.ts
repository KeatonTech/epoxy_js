import { Subscription } from 'rxjs';

/**
 * Tracks every listenable attached to a DOM element so that subscriptions can easily be cleaned
 * up when the element is removed from the window.
 */
export class DomGlobalState {

    private static listenerMap = new Map<Element, Array<Subscription>>();

    static addSubscriptionOnElement(element: Element, subscription: Subscription) {
        if (!DomGlobalState.listenerMap.has(element)) {
            DomGlobalState.listenerMap.set(element, []);
        }
        DomGlobalState.listenerMap.get(element).push(subscription);
    }

    static removeElement(element: Element) {
        for (const child of element.children) {
            DomGlobalState.removeElement(child);
        }
        if (DomGlobalState.listenerMap.has(element)) {
            for (const subscription of DomGlobalState.listenerMap.get(element)) {
                subscription.unsubscribe();
            }
        }
    }
}