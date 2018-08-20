import { AppDebugModel } from './model';
import { EpoxyDebuggerGlobalState } from "./debugger_global_state";
import { installDebugHooks, uninstallDebugHooks } from "./install_debug_hooks";
import { installMutationExtensions } from './mutation_serializer';

/**
 * Public interface for debugging functionality.
 */
export function debug(): AppDebugModel {
    installDebugHooks();
    installMutationExtensions();
    return EpoxyDebuggerGlobalState.model;
}

/**
 * Adds temporary debugging hooks. This function is mostly useful for
 * unit testing but may have other practical uses as well.
 */
export function runWithDebugger(cb: (debug: AppDebugModel) => void) {
    try {
        installDebugHooks();
        installMutationExtensions();
    } finally {
        try {
            EpoxyDebuggerGlobalState.reset();
            cb(EpoxyDebuggerGlobalState.model);
        } finally {
            uninstallDebugHooks();
        }
    }
}