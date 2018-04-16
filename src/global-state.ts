import {ListenableCollection, IListenableObject, IListenableArray} from './types';
import { Mutation } from './mutations';
import { makeListenable } from './make-listenable';

/**
 * Global state used to track getter calls for computed values.
 */
export class EpoxyGlobalState {
    private static trackingGetters = false;
    private static consumedGetters: {collection: ListenableCollection, key: PropertyKey}[] = [];

    static get DebugData(): IListenableObject<IListenableArray<Mutation<any>>> {
        return makeListenable({});
    }

    public static registerGetterCall(collection: ListenableCollection, key: PropertyKey) {
        if (!EpoxyGlobalState.trackingGetters) return;
        EpoxyGlobalState.consumedGetters.push({collection, key});
    }

    public static trackGetters(run: () => void): Map<ListenableCollection, Set<PropertyKey>> {
        if (EpoxyGlobalState.trackingGetters) {
            throw new Error('Cannot create a computed property within another computed property');
        }
        EpoxyGlobalState.consumedGetters = [];
        EpoxyGlobalState.trackingGetters = true;
        run();
        EpoxyGlobalState.trackingGetters = false;

        const ret = new Map<ListenableCollection, Set<PropertyKey>>();
        for (const getter of EpoxyGlobalState.consumedGetters) {
            if (!ret.has(getter.collection)) {
                ret.set(getter.collection, new Set());
            }
            ret.get(getter.collection).add(getter.key);
        }
        return ret;
    }

    public static logDebugMutation(label: string, mutation: Mutation<any>) {
        if (!EpoxyGlobalState.DebugData.hasOwnProperty(label)) {
            EpoxyGlobalState.DebugData[label] = makeListenable([]);
        }
        EpoxyGlobalState.DebugData[label].push(mutation);
    }
}