import { ListenableObject, IListenableArray, IGenericListenable, MakeListenable, Mutation } from "../../epoxy";

let DebugEventIdCounter = 0;

export class AppDebugModel extends ListenableObject {
    public readonly collections: IListenableArray<CollectionDebugModel>;
}

export class CollectionDebugModel extends ListenableObject {
    // Display name of the collection.
    public readonly debugName: string;

    // Reference to the collection instance.
    public readonly collection: IGenericListenable;

    // List of mutations or transactions that have been applied since tracking started.
    // The newest mutations will be at the end of the list.
    public readonly events: IListenableArray<GenericDebugEvent>;
}

export abstract class GenericDebugEvent extends ListenableObject {
    public readonly id = DebugEventIdCounter++;

    constructor(
        // Operation application timestamp.
        public readonly timestamp: number,
        // Call stack that lead to this debug event.
        public readonly callStack: string,
        // Batch stack that lead to this debug event.
        public readonly batchStack: string[],
    ) {
        super();
    }

    // Whether the operation is currently applied to the state of the app.
    public applied = true;

    // Whether the operation was successfully broadcasted. This will be false for
    //  mutations that occured in transactions that threw errors.
    public broadcasted = false;
}

export class MutationDebugEvent<T> extends GenericDebugEvent {
    constructor(public readonly mutation: DebuggableMutation<T>, callStack: string) {
        super(Date.now(), callStack, mutation.batchStack);
    }
}

export class BatchOperationDebugEvent<T> extends GenericDebugEvent {
    public readonly mutationEvents: MutationDebugEvent<T>[];

    addMutationEvent(event: MutationDebugEvent<T>) {
        this.mutationEvents.push(event);
    }
}

export type DebuggableMutation<T> = Mutation<T> & {
    batchStack: string[];
};