import {ListenableCollection, IActor, IListenableObject, IListenableArray, IGenericListenable, ActorSignifier} from './types';
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
 * Tracks the state of batching operations.
 */
export enum BatchingState {
    NO_BATCHING,
    BATCHING_ACTIVE,
    COLLAPSING_MUTATIONS,
};

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
        try {
            run();
        } finally {
            EpoxyGlobalState.trackingGetters = false;
        }

        const getters = new Map<ListenableCollection, Set<PropertyKey>>();
        for (const getter of EpoxyGlobalState.consumedGetters) {
            let collection = getter.collection;
            if (collection[ActorSignifier]) {
                collection = ((collection as any) as IActor).getBaseCollection();
            }

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
        try {
            run();
        } finally {
            EpoxyGlobalState.trackingGetters = originalState;
        }
    }


    // OPERATION BATCHING

    private static batchEndCallbacks: Array<(shouldRollback: boolean) => void> = [];
    private static _batchingState: BatchingState = BatchingState.NO_BATCHING;
    private static _batchName: string;

    static get batchingState() {
        return EpoxyGlobalState._batchingState;
    }

    static get batchName() {
        return EpoxyGlobalState._batchName;
    }

    static registerBatchCallback(cb: (shouldRollback: boolean) => void) {
        this.batchEndCallbacks.push(cb);
    }

    static runInBatch(batchName: string, run: Function, rollbackOnError: boolean = false) {
        this._batchingState = BatchingState.BATCHING_ACTIVE;
        this._batchName = batchName;
        this.batchEndCallbacks = [];

        let hitError = true;
        try {
            run();
            hitError = false;
        } finally {
            this._batchingState = BatchingState.COLLAPSING_MUTATIONS;
            this.batchEndCallbacks.forEach((cb) => cb(hitError && rollbackOnError));
            this._batchingState = BatchingState.NO_BATCHING;
            this._batchName = null;
        }
    }

    // When true, only allow mutations inside a batch or transaction.
    public static strictBatchingMode = false;


    // ACTORS

    private static _currentActor: string | Symbol | null = null;
    static get currentActor() {
        return this._currentActor;
    }

    static runAsActor(actorName: string | Symbol, run: Function) {
        EpoxyGlobalState._currentActor = actorName;
        try {
            run();
        } finally {
            EpoxyGlobalState._currentActor = null;
        }
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