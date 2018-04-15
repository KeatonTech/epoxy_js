# Epoxy JS
### The reactive glue that binds web apps together

Epoxy JS is a lightweight framework that adds change tracking to generic Javascript data structures
like Arrays and Objects. The end result is similar to the effect achieved by frontend frameworks like
Angular, but works without explicit change detection and can be used anywhere in Javascript (not just
inside special templates).

Here's a quick example:
```javascript

// Take a normal Javascript array and make it listenable.
const array = makeListenable([1, 1, 2, 3]);

// Turn the listenable array into an observable.
const updates = array.asObservable();

// Make it easier to test our observable.
let lastArrayValue;
updates.subscribe((newValue) => lastArrayValue = newValue);

// Add an item to the array.
array.push(5);
expect(lastArrayValue).eql([1, 1, 2, 3, 5]);

// Modify a value in the array.
array[0] = 0;
expect(lastArrayValue).eql(0, 1, 2, 3, 5]);

```

This works even for deeply nested data structures (eg. an array of objects of arrays). Unlike other
frameworks, the listenable data types _are_ just normal JS data structures. In the previous example,
the `array` variable actually is an Array (just one with some extra functionality attached to it).
This is accomplished using JS Proxies, which are supported in most major browsers whose name isn't
"Internet Explorer".

Epoxy doesn't just track when you modify an object, it also tracks when you access one. This lets
it automatically determine dependencies for computed properties.

```javascript

const values = makeListenable({
    score: 10,
    multiplier: 4;
});

// Total here is an Observable that updates whenever the total
// score changes
const total = computed(() => values.score * values.multiplier);

// Make it easier to test our observable.
let lastTotal;
total.subscribe((newValue) => lastTotal = newValue);
expect(lastTotal).equals(40);

// Update the score
values.score = 11;
expect(lastTotal).equals(44);

// Update the multiplier
values.multiplier = 5;
expect(lastTotal).equals(55);

```