import {ListenableCollection, IActor, IListenableObject, IListenableArray, IGenericListenable, ActorSignifier} from './types';
import { Mutation } from './mutations';
import { makeListenable } from './make-listenable';

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

    private static _batchingState: BatchingState = BatchingState.NO_BATCHING;
    private static _batchEndCallbacksStack: Array<Array<(shouldRollback: boolean) => void>> = [];
    private static _batchNamesStack: string[] = [];

    private static lastBatchIndex = 0;
    private static _batchIndexStack: number[] = [];

    static get batchingState() {
        return EpoxyGlobalState._batchingState;
    }

    static get batchIndex() {
        return EpoxyGlobalState._batchIndexStack[EpoxyGlobalState._batchIndexStack.length - 1];
    }

    static get batchStack() {
        return EpoxyGlobalState._batchNamesStack;
    }

    static get currentBatchName() {
        return EpoxyGlobalState._batchNamesStack[
            EpoxyGlobalState._batchNamesStack.length - 1];
    }

    static get currentBatchCallbacks() {
        return EpoxyGlobalState._batchEndCallbacksStack[
            EpoxyGlobalState._batchEndCallbacksStack.length - 1];
    }

    static registerBatchCallback(cb: (shouldRollback: boolean) => void) {
        EpoxyGlobalState.currentBatchCallbacks.push(cb);
    }
    
    static runInBatch(batchName: string, run: Function, rollbackOnError: boolean = false) {
        this._batchingState = BatchingState.BATCHING_ACTIVE;
        this._batchNamesStack.push(batchName);
        this._batchEndCallbacksStack.push([]);
        this._batchIndexStack.push(this.lastBatchIndex++);

        let hitError = true;
        try {
            run();
            hitError = false;
        } finally {
            const currentBatchCallbacks = this.currentBatchCallbacks;
            this._batchIndexStack.pop();
            this._batchEndCallbacksStack.pop();
            
            if (this._batchNamesStack.length === 1) {
                this._batchingState = BatchingState.COLLAPSING_MUTATIONS;
            }
            currentBatchCallbacks.forEach((cb) => cb(hitError && rollbackOnError));
            this._batchNamesStack.pop();
            if (this._batchNamesStack.length === 0) {
                this._batchingState = BatchingState.NO_BATCHING;
            }
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
}