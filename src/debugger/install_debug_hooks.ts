import { EpoxyGlobalState, Mutation, IGenericListenable } from '../../epoxy';
import { BaseProxyHandler } from '../base-proxy';
import { EpoxyDebuggerGlobalState } from './debugger_global_state';
import { DebuggableMutation } from './model';

/** Allow debug hooks to be uninstalled. */
const uninstallFunctions: Function[] = [];

export function installDebugHooks() {
    if (uninstallFunctions.length > 0) {
        throw new Error('Debug hooks are already installed!');
    }

    installMutationHook();
    installApplyMutationHook();
    installDebugWithLabelHook();
    installHandlerInitializerHook();
}

export function uninstallDebugHooks() {
    uninstallFunctions.forEach((fn) => fn());
    uninstallFunctions.splice(0, uninstallFunctions.length);
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
    uninstallFunctions.push(() => Mutation.initialize = ogMutationInitializer);
}

/**
 * Hooks into the applyMutation function of BaseProxyHandler and forwards those
 * mutations to th global state when appropriate.
 */
function installApplyMutationHook() {
    const ogApplyMutation = BaseProxyHandler.applyMutationInternalWrapped;
    BaseProxyHandler.applyMutationInternalWrapped = (
        handler: BaseProxyHandler<any>, target: any, mutation: Mutation<any>
    ) => {
        ogApplyMutation && ogApplyMutation(handler, target, mutation);
        if (!handler.hideFromDebugger && !EpoxyDebuggerGlobalState.inDebugMode) {
            EpoxyDebuggerGlobalState.addMutation(mutation as DebuggableMutation<any>, handler.output);
        }
    };
    uninstallFunctions.push(() => BaseProxyHandler.applyMutationInternalWrapped = ogApplyMutation);
}

/**
 * Hooks into the debugWithLabel function of BaseProxyHandler and forwards
 * those labeled data structures to the global state.
 */
function installDebugWithLabelHook() {
    const ogDebugWithLabel = BaseProxyHandler.debugWithLabel;
    BaseProxyHandler.debugWithLabel = (instance: BaseProxyHandler<any>, label: string) => {
        ogDebugWithLabel && ogDebugWithLabel(instance, label);
        if (!EpoxyDebuggerGlobalState.inDebugMode) {
            EpoxyDebuggerGlobalState.addCollection(instance.output, instance);
        }
    }
    uninstallFunctions.push(() => BaseProxyHandler.debugWithLabel = ogDebugWithLabel);
}

/**
 * Hooks into the constructor function of BaseProxyHandler to automatically hide
 * observables created in debug mode.
 */
function installHandlerInitializerHook() {
    const ogInitializer = BaseProxyHandler.initialize;
    BaseProxyHandler.initialize = (instance: BaseProxyHandler<any>) => {
        ogInitializer && ogInitializer(instance);
        instance.hideFromDebugger = EpoxyDebuggerGlobalState.inDebugMode;
    };
    uninstallFunctions.push(() => BaseProxyHandler.initialize = ogInitializer);
}