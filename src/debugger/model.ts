import { ListenableObject, IListenableArray, IGenericListenable, MakeListenable, Mutation, makeListenable } from "../../epoxy";
import { BatchOperationInvocation } from "../global-state";
import { BaseProxyHandler } from "../base-proxy";

let DebugEventIdCounter = 0;

export enum MutationApplicationState {
    AWAITING,           // Mutations that have not yet been applied to the state.
    OVERWRITTEN,        // Mutations that did not make it into any batch mutation because
                        //  they were overwritten by a later mutation.
    BATCHED,            // Mutations created inside batch operations are grouped together
                        //  before being applied to the state, therefore individual mutations
                        //  within a batch cannot be controlled independently.
    ROLLED_BACK,        // Mutations that were rolled back due to an error in a transaction.
    APPLIED,            // Mutations that are currently affecting the state.
    UNAPPLIED,          // Mutations that were removed in the debugger.
}

export class DebugListenableObject extends ListenableObject {
    constructor() {
        super();
        this.hideFromDebugger();
    }
}

export class AppDebugModel extends DebugListenableObject {
    public readonly collections: IListenableArray<CollectionDebugModel> = makeListenable([]);

    // List of mutations that have been applied since tracking started.
    // The newest mutations will be at the end of the list.
    public readonly mutations: IListenableArray<MutationDebugEvent<any>> = makeListenable([]);

    // List of mutations that have been applied since tracking started, grouped into
    // a tree of transactions.
    public readonly events: IListenableArray<GenericDebugEvent> = makeListenable([]);
}

export class CollectionDebugModel extends DebugListenableObject {
    constructor(
        // Display name of the collection.
        public readonly label: string,

        // Reference to the collection instance.
        public readonly collection: IGenericListenable,

        // List of mutations that have been applied since tracking started.
        // The newest mutations will be at the end of the list.
        public readonly mutations: IListenableArray<MutationDebugEvent<any>> = makeListenable([]),
    ) {
        super();
    }
}

export abstract class GenericDebugEvent extends DebugListenableObject {
    public readonly id = DebugEventIdCounter++;

    constructor(
        // Operation application timestamp.
        public readonly timestamp: number,
        // Call stack that lead to this debug event.
        public readonly callStack: string,
        // Batch stack that lead to this debug event.
        public readonly batchStack: BatchOperationInvocation[],
    ) {
        super();
    }

    // Tracks the current state of the event as it is processed and modified.
    public state = MutationApplicationState.AWAITING;

    // Whether the operation was successfully broadcasted. This will be false for
    //  mutations that occured in transactions that threw errors.
    public broadcasted = false;
}

export class MutationDebugEvent<T> extends GenericDebugEvent {
    constructor(
        public readonly mutation: DebuggableMutation<T>, 
        public readonly collection: IGenericListenable,
        callStack: string
    ) {
        super(Date.now(), callStack, mutation.batchStack);
    }
}

export class BatchOperationDebugEvent<T> extends GenericDebugEvent {
    public readonly mutationEvents: IListenableArray<MutationDebugEvent<T>> = makeListenable([]);
    public readonly childEvents: IListenableArray<BatchOperationDebugEvent<any>> = makeListenable([]);

    constructor(
        public readonly batch: BatchOperationInvocation,
        callStack: string,
        batchStack: BatchOperationInvocation[],
    ) {
        super(Date.now(), callStack, batchStack);
    }

    addMutationEvent(event: MutationDebugEvent<T>) {
        this.mutationEvents.push(event);
    }

    addChildEvent(event: BatchOperationDebugEvent<any>) {
        this.childEvents.push(event);
    }
}

export type DebuggableMutation<T> = Mutation<T> & {
    batchStack: BatchOperationInvocation[];
    collection?: IGenericListenable;

    // Tracks the current state of the event as it is processed and modified.
    state: MutationApplicationState;

    // For mutations created by a mutation sequence, this field lists all of the
    //  original mutations that fed into it.
    derivedFrom?: Array<DebuggableMutation<T>>;

    // For mutations that did not make it into the composite, this field contains
    //  the mutation that overwrote their affect.
    overwrittenBy?: DebuggableMutation<T>;

    // For mutations that were combined into a composite, this is the composite.
    combinedInto?: DebuggableMutation<T>;
};
