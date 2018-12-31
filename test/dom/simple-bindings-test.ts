import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import 'mocha';
import { bindAttribute, bindInnerHTML, bindStyle, removeElement } from '../../dom';
import { makeListenable } from '../../epoxy';
import { bindClass } from '../../src/dom/simple-bindings';

const { document } = (new JSDOM(`...`)).window;

describe('Simple DOM bindings', () => {
    it('binds to an element attribute', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable({title: 'test'});
        bindAttribute(el, 'title', () => listenable.title);

        expect(el.getAttribute('title')).eqls('test');

        listenable.title = 'Updated';
        expect(el.getAttribute('title')).eqls('Updated');
    });

    it('binds to an element CSS style', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable({color: 'red'});
        bindStyle(el, 'backgroundColor', () => listenable.color);

        expect(el.style.backgroundColor).eqls('red');

        listenable.color = 'blue';
        expect(el.style.backgroundColor).eqls('blue');
    });

    it('binds to an element innerHTML', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable({html: '<h1>H1</h1>'});
        bindInnerHTML(el, () => listenable.html);

        expect(el.children[0].tagName).eqls('H1');

        listenable.html = '<h2>H2</h2>';
        expect(el.children[0].tagName).eqls('H2');
    });

    it('binds to an element\'s class list', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable({isSelected: false});
        bindClass(el, 'selected', () => listenable.isSelected);
        expect(el.outerHTML).eqls('<div></div>');

        listenable.isSelected = true;
        expect(el.outerHTML).eqls('<div class="selected"></div>');
    });
    
    it('stops bindings when the element is marked destroyed', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);

        const listenable = makeListenable({title: 'test'});
        bindAttribute(el, 'title', () => listenable.title);

        expect(el.getAttribute('title')).eqls('test');

        listenable.title = 'Updated';
        expect(el.getAttribute('title')).eqls('Updated');

        removeElement(el);
        listenable.title = 'Updated Again';
        expect(el.getAttribute('title')).eqls('Updated');
    });
});