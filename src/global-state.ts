import {ListenableCollection, IListenableObject, IListenableArray, IListenable} from './types';
import { Mutation } from './mutations';
import { makeListenable } from './make-listenable';

/**
 * Interface for debug data.
 */
export class DebugEvent {
    mutation: Mutation<any>;
    stack: string;
    timestamp: number;
}

/**
 * Global state used to track getter calls for computed values.
 */
export class EpoxyGlobalState {


    // GETTER TRACKING

    private static trackingGetters = false;
    private static consumedGetters: {collection: ListenableCollection, key: PropertyKey}[] = [];

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


    // OPERATION BATCHING

    private static changedInBatch: Set<IListenable<any>> = new Set();
    private static _isBatching: boolean;


    static get isBatching() {
        return this._isBatching;
    }
    static set isBatching(newIsBatching: boolean) {
        if (this._isBatching && !newIsBatching) {
            this.changedInBatch.forEach((collection) => collection.broadcastCurrentValue());
        }
        this._isBatching = newIsBatching;
    }

    static markChangedDuringBatch(collection: IListenable<any>) {
        this.changedInBatch.add(collection);
    }


    // DEBUGGING TOOLS

    private static debugDataInternal: IListenableObject<IListenableArray<DebugEvent>>;

    static get DebugData(): IListenableObject<IListenableArray<DebugEvent>> {
        if (!EpoxyGlobalState.debugDataInternal) {
            EpoxyGlobalState.debugDataInternal = makeListenable({});
        }
        return EpoxyGlobalState.debugDataInternal;
    }

    public static logDebugMutation(label: string, mutation: Mutation<any>) {
        if (!EpoxyGlobalState.DebugData.hasOwnProperty(label)) {
            EpoxyGlobalState.DebugData[label] = makeListenable([]);
        }
        EpoxyGlobalState.DebugData[label].push({
            mutation,
            stack: new Error().stack,
            timestamp: Date.now(),
        });
    }
}