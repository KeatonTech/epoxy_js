import { EpoxyDomElement } from "./dom-element";

let GlobalDomComponentIdCounter = 1;

/** JS attribute used to indicate that an element is the root of a component */
const COMPONENT_ROOT_ATTR = 'data-epc-id';

/** Special CSS selector that represents the root of the component. */
const ROOT_SELECTOR = ":host";

/** Special CSS selector that disables scoping after itself. */
const DEEP_SELECTOR = "/deep/";

/** Regex used to grab all CSS rules. */
const CSS_RULE_REGEX = '(^[^{]*){([^}]*)}';

/**
 * An EpoxyDomComponent is an EpoxyDomElement that provides CSS view encapsulation.
 * The CSS scope extends from the root of this component and includes all children
 * until it reaches another EpoxyDomComponent.
 */
export abstract class EpoxyDomComponent extends EpoxyDomElement {

    /** CSS style text for this component. */
    static readonly style: string;

    /** Unique identifier for this component */
    static readonly componentId: number;

    /** Unique CSS class used for view isolation */
    static readonly isolationClass: string;

    constructor(tagName: string) {
        super(tagName);

        const ctor: any = this.constructor;
        if (!ctor.componentId) {
            ctor.componentId = GlobalDomComponentIdCounter++;
            ctor.isolationClass = `epxy_${ctor.componentId}`;

            EpoxyDomComponent.installStyle(
                EpoxyDomComponent.scopeSelectors(ctor.style || '', ctor.isolationClass)
            )
        }

        this.el.setAttribute(COMPONENT_ROOT_ATTR, ctor.componentId);
        this.el.classList.add(ctor.isolationClass);
        this.onAddedChild(this.handleAddedElement.bind(this));
    }

    /**
     * Process the CSS string so that all selectors are scoped to only apply
     * to elements with the given isolation class.
     */
    private static scopeSelectors(cssString: string, isolationClass: string) {
        const hostSelector = `[${COMPONENT_ROOT_ATTR}].${isolationClass}`;

        let output = '';
        let match;

        const regexp = new RegExp(CSS_RULE_REGEX, 'gm');
        while (match = regexp.exec(cssString)) {
            const selectors = match[1].split(',').map((selector) => {
                let trimmed = selector.trim();

                let append = '';
                const indexOfDeep = trimmed.indexOf(DEEP_SELECTOR);
                if (indexOfDeep !== -1) {
                    if (indexOfDeep !== trimmed.lastIndexOf(DEEP_SELECTOR)) {
                        throw new Error('CSS selector cannot have multiple /deep/s in it.');
                    }
                    [trimmed, append] = trimmed.split(DEEP_SELECTOR);
                    trimmed = trimmed.trim();
                }

                const lastHostIndex = trimmed.lastIndexOf(ROOT_SELECTOR);
                const lastSpaceIndex = trimmed.lastIndexOf(' ');
                if (lastHostIndex === -1) {
                    trimmed = hostSelector + ' ' + trimmed;
                } else {
                    trimmed = trimmed.replace(ROOT_SELECTOR, hostSelector);
                    if (lastSpaceIndex < lastHostIndex) {
                        return trimmed;
                    }
                }

                const endClass = trimmed[trimmed.length - 1] !== ' ' ? `.${isolationClass}` : '';
                return (trimmed + endClass).trim() + append;
            });
            output += `${selectors.join(', ')} \{${match[2].replace(/\s/g, '')}\}\n`;
        }

        return output;
    }

    /**
     * Add a new CSS style tag to the <head> of this page.
     */
    private static installStyle(cssString: string) {
        const style = document.createElement('style');
        style.innerText = cssString;
        document.head.appendChild(style);
    }

    /**
     * Ensures that all child elements until another EpoxyDomComponent are
     * correctly tagged for isolation.
     */
    private handleAddedElement(element: Element|EpoxyDomElement) {
        if (element instanceof EpoxyDomElement) {
            this.handleAddedEpoxyElement(element);
        } else {
            this.handleAddedDomElement(element);
        }
    }

    /**
     * Handles an EpoxyDomElement being added as a child to this one.
     */
    private handleAddedEpoxyElement(element: EpoxyDomElement) {
        element.addClass((this.constructor as any).isolationClass);

        // Child components are not part of this component's isolation scope.
        if (element instanceof EpoxyDomComponent) {
            return;
        }

        // Ensure that children added at runtime are properly scoped.
        element.onAddedChild(this.handleAddedElement.bind(this));

        // Scope all existing children.
        this.handleAddedDomElement((element as EpoxyDomComponent).el);
    }

    /**
     * Handles a standard HTML element being added as a child to this one.
     * Note that these are assumed to be static. If code outside of Epoxy adds
     * children at runtime, those children will not be properly scoped.
     */
    private handleAddedDomElement(element: Element) {
        element.classList.add((this.constructor as any).isolationClass);
        for (const child of element.children) {
            this.handleAddedDomElement(child);
        }
    }
}