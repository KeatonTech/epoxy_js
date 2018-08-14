# Epoxy JS
The reactive glue that binds web apps together. Epoxy is a lightweight library for building reactive data models.

## What is it?

Epoxy extends the two core Javascript data structures – [Objects](https://epoxy.js.org/untitled.md) and [Arrays](https://epoxy.js.org/epoxy-arrays.md) – to add built-in change detection and access tracking. Epoxy also provides tools to automatically respond to changes in these data structures, giving you the flexibility to build whatever kind of reactive app you want.

```typescript
import {makeListenable, computed} from 'epoxyjs';

const score = makeListenable({
    hits: 10,
    multiplier: 4,
});

const totalScore$: Observable<number> = computed(
    () => score.hits * score.multiplier);
    
// totalScore$ will update whenever score.hits or score.multiplier are modified.
```

Play with this sample code on [runkit](https://runkit.com/embed/2qv6nh3kdynk)!

## Why is it?

Epoxy is designed to be the backbone of your entire app. Other reactive methodologies focus only on the UI portion of your code, leaving your business logic to use its own imperative paradigm. This inevitably leads to problems where what the user sees doesn't exactly match the underlying state of the app. Even the best code written in this manner will likely end up with a large amount of boilerplate 'adapter' logic designed to translate imperative function calls and responses into some sort of reactive format for the frontend to consume. Epoxy's solution is simple:

> Build your entire app around one core, reactive data model!

Your business logic makes changes to the state of the app, your UI responds – no boilerplate, no adapters, no falling out of sync. Where other frameworks prioritize immutability, Epoxy politely scoffs at it. Epoxy applications have one single source of truth, one core data model instance, that changes when the state of the app changes. No juggling instances, no making copies, no funky custom data structures. In fact, that brings us to perhaps the most important feature of Epoxy.

> Epoxy data structures _are_ Javascript data structures.

Epoxy uses proxies behind the scenes so the objects and arrays it produces are literally just standard Javascript objects and arrays. It does this without extending the global array or object implementations, so we won't end up with another [smoosh-gate](https://dev.to/kayis/smooshing-javascript--5dpc). All of this means that Epoxy works with pretty much every Javascript library ever written.

### Why not MobX?

Epoxy is similar to MobX but with some notable advantages:

* Epoxy uses ES6 Proxy objects instead of explicit getters and setters – making it smaller, more compatible, and more efficient.
* Epoxy is interoperable with rxjs Observables.
* Epoxy has a deeper API that lets developers respond to specific mutations.
* Epoxy is designed with easier debugging in mind.

Credit where credit is due: MobX has significantly better browser support than Epoxy.

### Why not Redux?

Redux is great for large apps with large development teams that require a lot of enforced structure, but it's generally kind of a pain to use and prevents fast prototyping. All of Redux's best debugging features, like the time-travel debugger, are also possible with Epoxy. In fact, Redux-like patterns are possible in Epoxy for teams that desire more structure. Essentially, Redux enforces a structure that makes bad code good and great code, well, also good. Epoxy doesn't enforce anything, so your great code can be _great_! Also your bad code will stay bad so, be careful.

## How do I start?

```text
npm install --save epoxyjs
```

Epoxy depends on only rxjs core and the library itself is only about 1000 lines of javascript code, so it won't have a substantial impact on the code size of your project.

The [Epoxy Objects](https://epoxy.js.org/untitled) and [Epoxy Arrays](https://epoxy.js.org/epoxy-arrays) pages are good places to start learning how to use the library.
