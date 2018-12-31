import { expect } from 'chai';
import 'jsdom-global/register';
import 'mocha';
import { of, Subject } from 'rxjs';
import { appendChildrenFor } from '../../dom';
import { makeListenable } from '../../epoxy';
import { appendBoundChild } from '../../src/dom/structural-bindings';
import { excludeTypeFromMakeListenable } from '../../src/make-listenable';

excludeTypeFromMakeListenable(document.createElement('p').constructor as any);

describe('Structural DOM bindings', () => {
    describe('appendChildrenFor', () => {
        it('creates an initial list', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            expect(el.innerHTML).eqls(`<p>me</p><p>and me</p><!---->`);
        });

        it('preserves children before and after the binding', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            
            el.appendChild(document.createElement('before'));

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });
            el.appendChild(document.createElement('after'));

            expect(el.innerHTML).eqls(`<before></before><p>me</p><p>and me</p><!----><after></after>`);
        });

        it('adds to the list when new list items are added to the end', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable.push('me too');
            expect(el.innerHTML).eqls(`<p>me</p><p>and me</p><p>me too</p><!---->`);
        });

        it('adds to the list when new list items are added to the middle', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable.splice(1, 0, 'me too');
            expect(el.innerHTML).eqls(`<p>me</p><p>me too</p><p>and me</p><!---->`);
        });

        it('adds to the list when new list items are added to the beginning', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable.unshift('me too');
            expect(el.innerHTML).eqls(`<p>me too</p><p>me</p><p>and me</p><!---->`);
        });

        it('removes children from the end', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable.splice(1, 1);
            expect(el.innerHTML).eqls(`<p>me</p><!---->`);
        });

        it('removes children from the beginning', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable.shift();
            expect(el.innerHTML).eqls(`<p>and me</p><!---->`);
        });

        it('updates children at the end', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable[1] = 'also me';
            expect(el.innerHTML).eqls(`<p>me</p><p>also me</p><!---->`);
        });

        it('updates children at the beginning', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const listenable = makeListenable(['me', 'and me']);
            appendChildrenFor(el, listenable, (title) => {
                const element = document.createElement('p');
                element.innerHTML = title;
                return element;
            });

            listenable[0] = 'ME';
            expect(el.innerHTML).eqls(`<p>ME</p><p>and me</p><!---->`);
        });
    });

    describe('appendBoundChild', () => {
        it('renders elements immediately', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const child$ = of(document.createElement('test'));
            appendBoundChild(el, child$);

            expect(el.innerHTML).eqls(`<test></test><!---->`);
        });
        
        it('inserts the element when it becomes available', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const child$ = new Subject<HTMLElement>();
            appendBoundChild(el, child$);
            expect(el.innerHTML).eqls(`<!---->`);

            child$.next(document.createElement('p'));
            expect(el.innerHTML).eqls(`<p></p><!---->`);
        });
        
        it('inserts the element when it becomes available', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const child$ = new Subject<HTMLElement|undefined>();
            appendBoundChild(el, child$);
            child$.next(document.createElement('p'));
            expect(el.innerHTML).eqls(`<p></p><!---->`);

            child$.next(undefined);
            expect(el.innerHTML).eqls(`<!---->`);
        });
        
        it('swaps out the element', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            const child$ = new Subject<HTMLElement|undefined>();
            appendBoundChild(el, child$);
            child$.next(document.createElement('p'));
            expect(el.innerHTML).eqls(`<p></p><!---->`);

            child$.next(document.createElement('h1'));
            expect(el.innerHTML).eqls(`<h1></h1><!---->`);
        });
    });
});