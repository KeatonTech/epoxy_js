import { DebuggableMutation } from './model';
import { EpoxyGlobalState } from '../global-state';
import { Mutation } from '../mutations';

export function installDebugHooks() {
    installMutationHook();
}

function installMutationHook() {
    const ogMutationInitializer = Mutation.initialize;
    Mutation.initialize = (instance: DebuggableMutation<any>) => {
        ogMutationInitializer && ogMutationInitializer(instance);
        instance.batchStack = EpoxyGlobalState.batchStack.slice();
    };
}