import { Observable } from 'rxjs';
import { map } from "rxjs/operators";
import { computed, Listenable } from "../../epoxy";
import { listenableMap } from '../../operators';
import { DomGlobalState } from "./dom-global";
import { bindAttribute, bindClass, bindStyle, bindInnerHTML } from "./simple-bindings";
import { appendBoundChild, appendBoundChildren, appendChildrenFor } from "./structural-bindings";

/** Defines builder syntax that can be used to create Epoxy-bound UI. */
export class EpoxyDomElement {

    /** The underlying HTML element */
    protected readonly el: HTMLElement;

    constructor(
        /** The HTML tag name of the element. */
        readonly tagName: string
    ) {
        this.el = document.createElement(this.tagName);
    }

    appendTo(parent: HTMLElement) {
        parent.appendChild(this.el);
    }

    build(): HTMLElement {
        return this.el;
    }

    destroy() {
        DomGlobalState.removeElement(this.el);
    }

    /** HTML Attributes */
    setAttribute(attributeName: string, value: string): EpoxyDomElement {
        this.el.setAttribute(attributeName, value);
        return this;
    }

    bindAttribute(attributeName: string, value: () => string): EpoxyDomElement {
        bindAttribute(this.el, attributeName, value);
        return this;
    }

    /** CSS Classes */
    addClass(className: string): EpoxyDomElement {
        this.el.classList.add(className);
        return this;
    }

    bindClass(className: string, value: () => boolean): EpoxyDomElement {
        bindClass(this.el, className, value);
        return this;
    }

    /** CSS Styles */
    setStyle(styleName: string, value: string): EpoxyDomElement {
        this.el.style[styleName] = value;
        return this;
    }

    bindStyle(styleName: string, value: () => string): EpoxyDomElement {
        bindStyle(this.el, styleName, value);
        return this;
    }

    /** Inner HTML */
    setInnerHTML(value: string): EpoxyDomElement {
        this.el.innerHTML = value;
        return this;
    }

    bindInnerHTML(value: () => string): EpoxyDomElement {
        bindInnerHTML(this.el, value);
        return this;
    }

    /** Event Listeners */
    addEventListener(type: string, fn: ()=>any, options: {}): EpoxyDomElement {
        this.el.addEventListener.bind(this.el, arguments);
        return this;
    }

    removeEventListener(type: string, fn: ()=>any): EpoxyDomElement {
        this.el.removeEventListener.bind(this.el, arguments);
        return this;
    }


    /** Children */
    appendChild(child: HTMLElement|EpoxyDomElement): EpoxyDomElement {
        if (child instanceof EpoxyDomElement) {
            child = child.el;
        }
        this.el.appendChild(child); 
        return this;
    }

    appendConditionalChild(
        condition: () => boolean,
        makeChild: () => HTMLElement|EpoxyDomElement
    ): EpoxyDomElement {
       appendBoundChild(this.el, computed(condition).pipe(map((condition) => {
           if (condition) {
               const el = makeChild();
               if (el instanceof EpoxyDomElement) {
                   return el.el;
               } else {
                   return el;
               }
           }
           return undefined;
       })));
       return this;
    }

    appendBoundChild(
        child$: Observable<HTMLElement>
    ): EpoxyDomElement {
        appendBoundChild(this.el, child$);
        return this;
    }

    appendBoundChildren(
        children: Listenable<Array<HTMLElement|EpoxyDomElement>>
    ): EpoxyDomElement {
        appendBoundChildren(this.el, listenableMap(children, (child) => {
            if (child instanceof EpoxyDomElement) {
                return child.el;
            } else {
                return child;
            }
        }));
        return this;
    }

    appendChildrenFor<T>(
        list: Listenable<Array<T>>,
        render: (T) => HTMLElement|EpoxyDomElement
    ): EpoxyDomElement {
        appendChildrenFor(this.el, list, (item: T) => {
            const rendered = render(item);
            if (rendered instanceof EpoxyDomElement) {
                return rendered.el;
            } else {
                return rendered;
            }
        });
        return this;
    }
}