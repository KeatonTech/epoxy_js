import { DebuggableMutation } from './model';
import { EpoxyGlobalState, Mutation } from '../../epoxy';

export function installDebugHooks() {
    installMutationHook();
}

/**
 * Hooks into the mutation initializer function to start tracking the stack of
 * batches that lead to a mutation.
 */
function installMutationHook() {
    const ogMutationInitializer = Mutation.initialize;
    Mutation.initialize = (instance: DebuggableMutation<any>) => {
        ogMutationInitializer && ogMutationInitializer(instance);
        instance.batchStack = EpoxyGlobalState.batchInvocationsStack.slice();
    };
}

/**
 * Hooks into BaseProxyHandler to keep track of 
 */