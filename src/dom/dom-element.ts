import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { computed, Listenable, ArraySpliceMutation, PropertyMutation, ValueMutation } from '../../epoxy';
import { listenableMap } from '../../operators';
import { DomGlobalState } from './dom-global';
import { bindAttribute, bindClass, bindInnerHTML, bindStyle } from './simple-bindings';
import { appendBoundChild, appendBoundChildren } from './structural-bindings';

/** List of tag names that should be created in the SVG namespace. */
const SVG_TAGS = new Set([
    'altGlyph', 'altGlyphDef', 'altGlyphItem',
    'animate', 'animateColor', 'animateMotion', 'animateTransform', 'animation',
    'circle', 'clipPath', 'color-profile', 'defs', 'desc', 'discard', 'ellipse',
    'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
    'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow',
    'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage',
    'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
    'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
    'filter', 'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src',
    'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef', 'handler',
    'hatch', 'hatchpath', 'hkern', 'image', 'line', 'linearGradient', 'listener',
    'marker', 'mask', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'metadata',
    'missing-glyph', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'prefetch',
    'radialGradient', 'rect', 'set', 'solidColor', 'solidcolor', 'stop', 'svg',
    'switch', 'symbol', 'tbreak', 'text', 'textPath', 'tref', 'tspan', 'unknown',
    'use', 'view', 'vkern'
]);

/** Defines builder syntax that can be used to create Epoxy-bound UI. */
export class EpoxyDomElement {

    /** The underlying HTML element */
    protected readonly el: Element;

    /** Listener functions that run whenever a new child is added. */
    private onAddedChildListeners: Array<(Element) => void> = [];

    constructor(
        /** The HTML tag name of the element. */
        readonly tagName: string
    ) {
        if (SVG_TAGS.has(tagName)) {
            this.el = document.createElementNS('http://www.w3.org/2000/svg', this.tagName);
        } else {
            this.el = document.createElement(this.tagName);
        }
    }

    appendTo(parent: Element) {
        parent.appendChild(this.el);
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
        (this.el as HTMLElement).style[styleName] = value;
        return this;
    }

    bindStyle(styleName: string, value: () => string): EpoxyDomElement {
        bindStyle(this.el as HTMLElement, styleName, value);
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

    onAddedChild(handler: (Element) => void) {
        this.onAddedChildListeners.push(handler);
    }
    

    /** Children */
    appendChild(child: Element|EpoxyDomElement): EpoxyDomElement {
        if (child instanceof EpoxyDomElement) {
            child = child.el;
        }
        this.el.appendChild(child); 
        this.onAddedChildListeners.forEach((cb) => cb(child));
        return this;
    }

    appendConditionalChild(
        condition: () => boolean,
        makeChild: () => Element|EpoxyDomElement
    ): EpoxyDomElement {
       return this.appendBoundChild(computed(condition).pipe(
           map((condition) => condition ? makeChild() : undefined)));
    }

    appendBoundChild(
        child$: Observable<Element|EpoxyDomElement>
    ): EpoxyDomElement {
        appendBoundChild(this.el, child$.pipe(
            map((child) => child instanceof EpoxyDomElement ? child.el : child)));
        child$.subscribe((child) => this.onAddedChildListeners.forEach((cb) => cb(child)));
        return this;
    }

    appendBoundChildren(
        children: Listenable<Array<Element|EpoxyDomElement>>
    ): EpoxyDomElement {
        appendBoundChildren(this.el, listenableMap(children, (child) => {
            if (child instanceof EpoxyDomElement) {
                return child.el;
            } else {
                return child;
            }
        }));

        for (const child of children) {
            this.onAddedChildListeners.forEach((cb) => cb(child));
        }

        DomGlobalState.addSubscriptionOnElement(
            this.el,
            children.listen().subscribe((mutation) => {
                if (mutation instanceof ArraySpliceMutation) {
                    for (const inserted of mutation.inserted) {
                        this.onAddedChildListeners.forEach((cb) => cb(inserted));
                    }
    
                } else if (mutation instanceof PropertyMutation) {
                    this.onAddedChildListeners.forEach((cb) => cb(mutation.newValue));
    
                } else if (mutation instanceof ValueMutation) {
                    for (const child of children) {
                        this.onAddedChildListeners.forEach((cb) => cb(child));
                    }
                }
            }));

        return this;
    }

    appendChildrenFor<T>(
        list: Listenable<Array<T>>,
        render: (T) => Element|EpoxyDomElement
    ): EpoxyDomElement {
        return this.appendBoundChildren(listenableMap(
            list,
            render,
            false,
            true
        ));
    }
}