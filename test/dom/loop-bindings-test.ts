import 'mocha';
import { expect } from 'chai';
import { makeListenable } from '../../epoxy';
import { JSDOM, Element } from 'jsdom';
import { bindChildren } from '../../dom';
import { excludeTypeFromMakeListenable } from '../../src/make-listenable';

const { document } = (new JSDOM(`...`)).window;
excludeTypeFromMakeListenable(document.createElement('p').constructor);

describe('Loop DOM bindings', () => {
    it('creates an initial list', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        expect(el.innerHTML).eqls(`<p>me</p><p>and me</p>`);
    });

    it('adds to the list when new list items are added to the end', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable.push('me too');
        expect(el.innerHTML).eqls(`<p>me</p><p>and me</p><p>me too</p>`);
    });

    it('adds to the list when new list items are added to the middle', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable.splice(1, 0, 'me too');
        expect(el.innerHTML).eqls(`<p>me</p><p>me too</p><p>and me</p>`);
    });

    it('adds to the list when new list items are added to the beginning', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable.unshift('me too');
        expect(el.innerHTML).eqls(`<p>me too</p><p>me</p><p>and me</p>`);
    });

    it('removes children from the end', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable.splice(1, 1);
        expect(el.innerHTML).eqls(`<p>me</p>`);
    });

    it('removes children from the beginning', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable.shift();
        expect(el.innerHTML).eqls(`<p>and me</p>`);
    });

    it('updates children at the end', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable[1] = 'also me';
        expect(el.innerHTML).eqls(`<p>me</p><p>also me</p>`);
    });

    it('updates children at the beginning', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable(['me', 'and me']);
        bindChildren(el, listenable, (title) => {
            const element = document.createElement('p');
            element.innerHTML = title;
            return element;
        });

        listenable[0] = 'ME';
        expect(el.innerHTML).eqls(`<p>ME</p><p>and me</p>`);
    });
});