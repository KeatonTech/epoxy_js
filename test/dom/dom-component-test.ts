import { expect } from 'chai';
import 'jsdom-global/register';
import 'mocha';
import { Subject } from 'rxjs';
import { makeListenable, Listenable, excludeTypeFromMakeListenable } from '../../epoxy';
import { EpoxyDomComponent, EpoxyDomElement } from '../../dom';

excludeTypeFromMakeListenable(EpoxyDomElement);
excludeTypeFromMakeListenable(Node);

describe('EpoxyDomComponent', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
    });

    describe('CSS Rewriter', () => {
        it('should rewrite simple tag selectors', () => {
            const result = testCssRewriter(`
                p {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} p.${result.cssClass} {property:value;}\n`
            );
        });

        it('should rewrite class and id selectors', () => {
            const result = testCssRewriter(`
                .class, #id {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} .class.${result.cssClass}, ` + 
                `[data-epc-id].${result.cssClass} #id.${result.cssClass}` + 
                ` {property:value;}\n`
            );
        });

        it('should work with child selectors', () => {
            const result = testCssRewriter(`
                ul li {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} ul li.${result.cssClass} {property:value;}\n`
            );
        });

        it('should allow a :host selector', () => {
            const result = testCssRewriter(`
                :host {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} {property:value;}\n`
            );
        });

        it('should allow companion selectors on the :host selector', () => {
            const result = testCssRewriter(`
                :host:focus {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass}:focus {property:value;}\n`
            );
        });

        it('should allow children after the :host selector', () => {
            const result = testCssRewriter(`
                :host :focus {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} :focus.${result.cssClass} {property:value;}\n`
            );
        });

        it('should work with an embedded /deep/ selector', () => {
            const result = testCssRewriter(`
                p /deep/ div {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} p.${result.cssClass} div {property:value;}\n`
            );
        });

        it('should work with an embedded /deep/ selector after a child selector', () => {
            const result = testCssRewriter(`
                p .class /deep/ div {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} p .class.${result.cssClass} div {property:value;}\n`
            );
        });

        it('should work with a frontloaded /deep/ selector', () => {
            const result = testCssRewriter(`
                /deep/ div {
                    property: value;
                }
            `);
            expect(result.output).eqls(
                `[data-epc-id].${result.cssClass} div {property:value;}\n`
            );
        });
    });

    it('should add a css isolation class and an attr to the root element', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        const comp = new TestComponent();
        expect(comp['el'].outerHTML).eqls(
            `<div data-epc-id="${TestComponent.componentId}" ` +
            `class="${TestComponent.isolationClass}"></div>`);
    });

    it('should add a css isolation class to child elements', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        const comp = new TestComponent().appendChild(document.createElement('p'));
        expect(comp['el'].innerHTML).eqls(`<p class="${TestComponent.isolationClass}"></p>`);
    });

    it('should add a css isolation class to bound child elements', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        const child$ = new Subject<Element>();
        const comp = new TestComponent().appendBoundChild(child$);
        expect(comp['el'].innerHTML).eqls('<!---->');

        child$.next(document.createElement('h1'));
        expect(comp['el'].innerHTML).eqls(
            `<h1 class="${TestComponent.isolationClass}"></h1><!---->`);
    });

    it('should add a css isolation class to bound EpoxyDomElement child elements', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        const child$ = new Subject<EpoxyDomElement>();
        const comp = new TestComponent().appendBoundChild(child$);
        expect(comp['el'].innerHTML).eqls('<!---->');

        const childEl = new EpoxyDomElement('div');
        child$.next(childEl);
        expect(comp['el'].innerHTML).eqls(
            `<div class="${TestComponent.isolationClass}"></div><!---->`);

        childEl.appendChild(document.createElement('h2'));
        expect(comp['el'].innerHTML).eqls(
            `<div class="${TestComponent.isolationClass}">`+
            `<h2 class="${TestComponent.isolationClass}"></h2>`+
            `</div><!---->`);
    });

    it('should add a css isolation class to loop bound EpoxyDomElement child elements', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        const list = makeListenable([1, 2]);
        const comp = new TestComponent().appendChildrenFor(
            list, (number) => new EpoxyDomElement('h2').setInnerHTML(number));
        expect(comp['el'].innerHTML).eqls(
            `<h2 class="${TestComponent.isolationClass}">1</h2>` +
            `<h2 class="${TestComponent.isolationClass}">2</h2>` +
            '<!---->');

        list.push(3);
        expect(comp['el'].innerHTML).eqls(
            `<h2 class="${TestComponent.isolationClass}">1</h2>` +
            `<h2 class="${TestComponent.isolationClass}">2</h2>` +
            `<h2 class="${TestComponent.isolationClass}">3</h2>` +
            '<!---->');
    });

    it('stops the isolation scope at the boundary of another component', () => {
        class TestComponent extends EpoxyDomComponent {
            static style = '';
            constructor() {
                super('div');
            }
        }

        class InnerTestComponent extends EpoxyDomComponent {
            constructor() {
                super('article');
            }
        }

        const child$ = new Subject<EpoxyDomElement>();
        const comp = new TestComponent().appendBoundChild(child$);
        expect(comp['el'].innerHTML).eqls('<!---->');

        const childEl = new InnerTestComponent();
        child$.next(childEl);
        expect(comp['el'].innerHTML).eqls(
            `<article data-epc-id="${InnerTestComponent.componentId}" ` + 
            `class="${InnerTestComponent.isolationClass} ${TestComponent.isolationClass}">` +
            `</article><!---->`);

        childEl.appendChild(document.createElement('h2'));
        expect(comp['el'].innerHTML).eqls(
            `<article data-epc-id="${InnerTestComponent.componentId}" ` + 
            `class="${InnerTestComponent.isolationClass} ${TestComponent.isolationClass}">` +
            `<h2 class="${InnerTestComponent.isolationClass}"></h2>` +
            `</article><!---->`);
    });
});

/**
 * Testbed for getting the output of the CSS rewriter.
 */
function testCssRewriter(cssString: string): {
    output: string;
    cssClass: string;
} {
    class TestCssComponent extends EpoxyDomComponent {
        static style = cssString;
    }

    new TestCssComponent('p');
    const output = {
        output: (document.head.children[0] as HTMLStyleElement).innerText,
        cssClass: TestCssComponent.isolationClass,
    };

    return output;
}