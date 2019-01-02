import { expect } from 'chai';
import 'jsdom-global/register';
import 'mocha';
import { EpoxyDomElement } from '../../dom';
import { makeListenable, Listenable, excludeTypeFromMakeListenable } from '../../epoxy';

excludeTypeFromMakeListenable(document.createElement('p').constructor as any);

describe('EpoxyDomElement', () => {
    it('should build an element that can be added to another', () => {
        const parent = document.createElement('article');
        new EpoxyDomElement('div').appendTo(parent);
        expect(parent.innerHTML).eqls('<div></div>');
    });

    it('should add attributes', () => {
        const parent = document.createElement('article');
        new EpoxyDomElement('div').setAttribute('label', 'hi').appendTo(parent);
        expect(parent.innerHTML).eqls('<div label="hi"></div>');
    });

    it('should bind attributes', () => {
        const parent = document.createElement('article');
        const data = makeListenable({label: 'hi person'});
        new EpoxyDomElement('div').bindAttribute('label', () => data.label).appendTo(parent);
        expect(parent.innerHTML).eqls('<div label="hi person"></div>');

        data.label = 'greetings user';
        expect(parent.innerHTML).eqls('<div label="greetings user"></div>');
    });

    it('should add styles', () => {
        const parent = document.createElement('article');
        new EpoxyDomElement('div').setStyle('color', 'red').appendTo(parent);
        expect(parent.innerHTML).eqls('<div style="color: red;"></div>');
    });

    it('should bind styles', () => {
        const parent = document.createElement('article');
        const data = makeListenable({color: 'green'});
        new EpoxyDomElement('div').bindStyle('color', () => data.color).appendTo(parent);
        expect(parent.innerHTML).eqls('<div style="color: green;"></div>');

        data.color = 'purple';
        expect(parent.innerHTML).eqls('<div style="color: purple;"></div>');
    });

    it('should add a class', () => {
        const parent = document.createElement('article');
        new EpoxyDomElement('div').addClass('item').appendTo(parent);
        expect(parent.innerHTML).eqls('<div class="item"></div>');
    });

    it('should bind the presence of a class', () => {
        const parent = document.createElement('article');
        const data = makeListenable({selected: false});
        new EpoxyDomElement('div').bindClass('selected', () => data.selected).appendTo(parent);
        expect(parent.innerHTML).eqls('<div></div>');

        data.selected = true;
        expect(parent.innerHTML).eqls('<div class="selected"></div>');

        data.selected = false;
        expect(parent.innerHTML).eqls('<div class=""></div>');
    });

    it('should add an HTMLElement child', () => {
        const parent = document.createElement('article');
        const child = document.createElement('p');
        new EpoxyDomElement('div').appendChild(child).appendTo(parent);
        expect(parent.innerHTML).eqls('<div><p></p></div>');
    });

    it('should add an EpoxyDomElement child', () => {
        const parent = document.createElement('article');
        const child = new EpoxyDomElement('p');
        new EpoxyDomElement('div').appendChild(child).appendTo(parent);
        expect(parent.innerHTML).eqls('<div><p></p></div>');
    });

    it('should conditionally append a child', () => {
        const parent = document.createElement('article');
        const child = document.createElement('p');
        const data = makeListenable({visible: false});

        new EpoxyDomElement('div').appendConditionalChild(() => data.visible, () => child).appendTo(parent);
        expect(parent.innerHTML).eqls('<div><!----></div>');

        data.visible = true;
        expect(parent.innerHTML).eqls('<div><p></p><!----></div>');

        data.visible = false;
        expect(parent.innerHTML).eqls('<div><!----></div>');
    });

    it('should append a child for each list item', () => {
        const parent = document.createElement('article');
        const data = makeListenable(['hello', 'world']);

        new EpoxyDomElement('div')
            .appendChildrenFor(data, (item) => 
                new EpoxyDomElement('p').setInnerHTML(item)
            )  
            .appendTo(parent);  

        expect(parent.innerHTML).eqls('<div><p>hello</p><p>world</p><!----></div>');

        data.splice(1, 1);
        expect(parent.innerHTML).eqls('<div><p>hello</p><!----></div>');
    });

    it ('should work with inheritance', () => {

        class ListItem extends EpoxyDomElement {
            constructor(item: Listenable<{name: string}>) {
                super('p');
                this
                    .addClass('item')
                    .bindInnerHTML(() => item.name);
            }
        }

        const parent = document.createElement('article');
        const data = makeListenable([{name: 'hello'}]);

        new EpoxyDomElement('div')
            .appendChildrenFor(data, (item) => new ListItem(item))  
            .appendTo(parent);  

        expect(parent.innerHTML).eqls('<div><p class="item">hello</p><!----></div>');

        data[0].name = 'updated';
        expect(parent.innerHTML).eqls('<div><p class="item">updated</p><!----></div>');
    });

    it('should generate SVG elements when necessary', () => {
        const svgEl = new EpoxyDomElement('g');
        expect(svgEl['el'].namespaceURI).eqls('http://www.w3.org/2000/svg');
    });
});