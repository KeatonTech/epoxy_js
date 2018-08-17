import { AppDebugModel, BatchOperationDebugEvent, CollectionDebugModel, MutationDebugEvent, DebuggableMutation } from "./model";
import { IGenericListenable, EpoxyGlobalState } from "../../epoxy";
import { BaseProxyHandler } from '../base-proxy';
import { filter } from "../../operators";
import { BatchOperationInvocation } from "../global-state";

/**
 * Keeps track of all mutations that occur in the app. All data sources for
 * the debugger are derived from listenable collections in this state.
 */ 
export class EpoxyDebuggerGlobalState {

    private static _inDebugMode = false;
    public static get inDebugMode() {
        return this._inDebugMode;
    }
    public static runInDebugMode(cb: Function) {
        try {
            EpoxyDebuggerGlobalState._inDebugMode = true;
            cb();
        } finally {
            EpoxyDebuggerGlobalState._inDebugMode = false;
        }
    }

    private static _model = new AppDebugModel();
    public static get model() {
        return EpoxyDebuggerGlobalState._model.asReadonly() as AppDebugModel;
    }

    public static reset() {
        EpoxyDebuggerGlobalState._model = new AppDebugModel();
    }

    private static _batchStack: Array<[BatchOperationInvocation, BatchOperationDebugEvent<any>]> = [];

    public static addCollection(collection: IGenericListenable, handler: BaseProxyHandler<any>) {
        EpoxyDebuggerGlobalState.runInDebugMode(() => {
            const label = handler.debugLabel;
            if (!label) {
                throw new Error('Cannot debug a collection without a debug label');
            }
            if (this._model.collections.find((c) => c.label === label)) {
                throw new Error(`A collection with label '${label}' already exists in the debugger`);
            }

            const debugEvents = filter(this._model.mutations, (event) => event.collection === collection);
            const debugModel = new CollectionDebugModel(label, collection, debugEvents);
            this._model.collections.push(debugModel);
        });
    }

    public static addMutation(mutation: DebuggableMutation<any>, collection: IGenericListenable) {
        EpoxyDebuggerGlobalState.runInDebugMode(() => {
            const mutationDebugEvent = new MutationDebugEvent(mutation, collection, new Error().stack);
            EpoxyDebuggerGlobalState._model.mutations.push(mutationDebugEvent);

            EpoxyDebuggerGlobalState.updateStackToMatchMutation(mutation);
            if (mutation.batchStack.length === 0) {
                EpoxyDebuggerGlobalState._model.events.push(mutationDebugEvent);
            } else {
                const currentStack = EpoxyDebuggerGlobalState._batchStack;
                const batch = currentStack[currentStack.length - 1][1];
                batch.addMutationEvent(mutationDebugEvent);
            }
        });
    }

    private static updateStackToMatchMutation(mutation: DebuggableMutation<any>) {
        const currentStack = EpoxyDebuggerGlobalState._batchStack;

        // How far in do the two stacks match?
        // If the two stacks have no values in common, this will be zero.
        let stackEqualityIndex = currentStack.findIndex(([invocation, _], i) => {
            return i < mutation.batchStack.length && invocation !== mutation.batchStack[i];
        });
        const perfectMatch = stackEqualityIndex === -1 &&
                                currentStack.length === mutation.batchStack.length;
        stackEqualityIndex = stackEqualityIndex === -1 ? currentStack.length : stackEqualityIndex;

        // Trim off additional batches from the current stack. These are considered closed.
        for (let i = stackEqualityIndex; i < currentStack.length; i++){
            currentStack.pop();
        }

        // Add new batches to the current stack until it matches the mutation stack.
        for (let i = currentStack.length; i < mutation.batchStack.length; i++) {
            const invocationStack = currentStack.map(i => i[0]);
            const event = new BatchOperationDebugEvent(
                mutation.batchStack[i], new Error().stack, invocationStack);
            currentStack.push([mutation.batchStack[i], event]);
            if (currentStack.length > 1) {
                currentStack[i - 1][1].addChildEvent(event);
            } else {
                EpoxyDebuggerGlobalState._model.events.push(event);
            }
        }
    }
}