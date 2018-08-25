import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EpoxyGlobalState } from './global-state';
import { BaseProxyHandler } from './base-proxy';
import { ActorSignifier, IActor, ListenableCollection, ListenableSignifier } from './types';
import { Mutation } from './mutations';

/**
 * An actor wraps a listenable collection in such a way that mutations caused
 * by the actor do not result in listener functions within the actor running.
 * In other words, it allows a class to ignore its own edits to a model.
 */
export function asActor<T extends ListenableCollection>(actorName: string | Symbol, collection: T) {
    if (!collection[ListenableSignifier]) {
        throw new Error('Collection passed into asActor is not listenable.');
    }

    const handler = new ActorProxyHandler(actorName, collection);
    const output = new Proxy(collection, handler);
    handler.setOutput(output);
    return output as T & IActor;
}

/**
 * Internal Proxy type used to wrap collection functions with runAsActor and
 * filter out actor-caused events from the listener functions.
 */
class ActorProxyHandler extends BaseProxyHandler<ListenableCollection> {
    protected filteredMutations: Observable<Mutation<any>>;

    constructor(
        private name: string | Symbol,
        private collection: ListenableCollection,
    ) {
        super(() => null);

        this.filteredMutations = collection.listen().pipe(
            filter((mutation) => mutation.createdBy !== name)
        );
    }

    copyData(target: ListenableCollection) {
        return this.collection.staticCopy();
    }

    get(target: ListenableCollection, property: PropertyKey) {

        // Override listener functions to filter out any mutations caused by this actor.
        if (ActorProxyHandler.LISTENER_FUNCTION_OVERRIDES.hasOwnProperty(property)) {
            let value = ActorProxyHandler.LISTENER_FUNCTION_OVERRIDES[property];
            if (value instanceof Function) {
                value = value.bind(this, this, target);
            }
            return value;
        }

        let getResult = target[property];

        // If the getter returned a function, wrap that function in `runAsActor`.
        // This handles the case of things like Array.splice which themselves cause
        //   new mutations to be generated.
        if (typeof getResult === 'function') {
            const originalFn = getResult as Function;
            const handler = this;
            return function() {
                const callArgs = Array.prototype.slice.call(arguments);
                let result;
                EpoxyGlobalState.runAsActor(handler.name, () => {
                    result = originalFn.apply(target, callArgs);
                });
                return result;
            };
        }

        // If the getter returned another listenable collection, wrap that too.
        try {
            if (getResult[ListenableSignifier]) {
                getResult = asActor(this.name, getResult);
            }
        } catch (e) {}
        
        return getResult;
    }

    set(target: ListenableCollection, property: PropertyKey, value: any) {
        EpoxyGlobalState.runAsActor(this.name, () => {
            target[property] = value;
        });
        return true;
    }


    // LISTENER FUNCTION OVERRIDES

    private static LISTENER_FUNCTION_OVERRIDES = {
        /**
         * Provides a way of identifying actor collections.
         */
        [ActorSignifier]: true,

        /**
         * Provides the base collection that this actor wraps.
         */
        getBaseCollection(handler: ActorProxyHandler) {
            return handler.collection;
        },

        /**
         * Returns a stream of all mutation events on this Array instance, including changes to any
         * of its subproperties.
         */
        listen<T extends ListenableCollection>(handler: ActorProxyHandler, target: T) {
            return handler.filteredMutations;
        },
        
        /**
         * Returns an observable that updates whenever this data structure is mutated in any way.
         * Note that this involves making shallow copies and so should be used sparingly.
         */
        asObservable<T extends ListenableCollection>(handler: ActorProxyHandler, target: T) {
            return this.outputAsObservable;
        },
        
        /**
         * Returns an Array that contains the same data as this array, except all of its properties
         * are observables rather than raw values. This is useful for plugging the structure into
         * consumers such as UI frameworks. 
         */
        observables<T extends ListenableCollection>(handler: ActorProxyHandler, target: T) {
            return handler.observables();
        },
    }
}