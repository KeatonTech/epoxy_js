import {ListenableCollection, IListenableObject, IListenableArray, IGenericListenable} from './types';
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
 * Information about a tracked function run
 */
export interface TrackedRunData {
    getters: Map<ListenableCollection, Set<PropertyKey>>;
    nestedUnsubscribeFunctions: Array<()=>void>;
}

/**
 * Global state used to track getter calls for computed values.
 */
export class EpoxyGlobalState {


    // GETTER TRACKING

    private static trackingGetters = false;
    private static consumedGetters: {collection: ListenableCollection, key: PropertyKey}[] = [];

    // Allows cancelling an autorun() to also cancel all of its internal autorunTrees.
    private static nestedUnsubscribeFunctions: Array<()=>void> = [];

    // True if the run of the current autorun() function is the first run. This is used to make
    // sure nested autorunTree() functions aren't created more than once.
    private static initialAutorun = false;
    public static get isInitialAutorun() {
        return !EpoxyGlobalState.trackingGetters || EpoxyGlobalState.initialAutorun
    }

    public static registerGetterCall(collection: ListenableCollection, key: PropertyKey) {
        if (!EpoxyGlobalState.trackingGetters) return;
        EpoxyGlobalState.consumedGetters.push({collection, key});
    }

    public static registerNestedUnsubscribe(fn: () => void) {
        if (!EpoxyGlobalState.trackingGetters) return;
        EpoxyGlobalState.nestedUnsubscribeFunctions.push(fn);
    }

    public static trackGetters(run: () => void): TrackedRunData  {
        if (EpoxyGlobalState.trackingGetters) {
            throw new Error('Cannot create a computed property within another computed property');
        }
        EpoxyGlobalState.consumedGetters = [];
        EpoxyGlobalState.nestedUnsubscribeFunctions = [];
        EpoxyGlobalState.trackingGetters = true;
        run();
        EpoxyGlobalState.trackingGetters = false;

        const getters = new Map<ListenableCollection, Set<PropertyKey>>();
        for (const getter of EpoxyGlobalState.consumedGetters) {
            if (!getters.has(getter.collection)) {
                getters.set(getter.collection, new Set());
            }
            getters.get(getter.collection).add(getter.key);
        }
        return {
            getters: getters,
            nestedUnsubscribeFunctions: EpoxyGlobalState.nestedUnsubscribeFunctions,
        };
    }

    /**
     * Similar to trackGetters, but can be run within an existing trackGetters state. This essentially
     * pauses the parent tracking, so the parent will not automatically react to changes in any getters
     * caught in this tracker.
     */
    public static trackGettersNestable(run: () => void): TrackedRunData {
        const currentConsumedGetters = EpoxyGlobalState.consumedGetters;
        const currentUnsubscribeFunctions = EpoxyGlobalState.nestedUnsubscribeFunctions;
        const currentTrackingState = EpoxyGlobalState.trackingGetters;

        EpoxyGlobalState.trackingGetters = false;
        const ret = EpoxyGlobalState.trackGetters(run);

        EpoxyGlobalState.consumedGetters = currentConsumedGetters;
        EpoxyGlobalState.nestedUnsubscribeFunctions = currentUnsubscribeFunctions;
        EpoxyGlobalState.trackingGetters = currentTrackingState;
        return ret;
    }

    /**
     * Allows certain operations to be ignored by getter tracking.
     */
    public static pauseGetterTracking(run: () => void) {
        const originalState = EpoxyGlobalState.trackingGetters;
        EpoxyGlobalState.trackingGetters = false;
        run();
        EpoxyGlobalState.trackingGetters = originalState;
    }

    /**
     * Tracks the fact that a run of an autorun function is its initial run. Subsequent runs won't
     * re-create autorunTree() functions.
     */
    public static runAsInitialAutorun(run: () => void) {
        const originalState = EpoxyGlobalState.initialAutorun;
        EpoxyGlobalState.initialAutorun = true;
        run();
        EpoxyGlobalState.initialAutorun = originalState;
    }


    // OPERATION BATCHING

    private static changedInBatch: Set<IGenericListenable> = new Set();
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

    static markChangedDuringBatch(collection: IGenericListenable) {
        this.changedInBatch.add(collection);
    }


    // ACTORS

    private static _currentActor: string | Symbol | null = null;
    static get currentActor() {
        return this._currentActor;
    }

    static runAsActor(actorName: string | Symbol, fn: Function) {
        EpoxyGlobalState._currentActor = actorName;
        fn();
        EpoxyGlobalState._currentActor = null;
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