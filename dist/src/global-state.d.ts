import { ListenableCollection, IListenableObject, IListenableArray, IListenable } from './types';
import { Mutation } from './mutations';
/**
 * Interface for debug data.
 */
export declare class DebugEvent {
    mutation: Mutation<any>;
    stack: string;
    timestamp: number;
}
/**
 * Global state used to track getter calls for computed values.
 */
export declare class EpoxyGlobalState {
    private static trackingGetters;
    private static consumedGetters;
    static registerGetterCall(collection: ListenableCollection, key: PropertyKey): void;
    static trackGetters(run: () => void): Map<ListenableCollection, Set<PropertyKey>>;
    private static changedInBatch;
    private static _isBatching;
    static isBatching: boolean;
    static markChangedDuringBatch(collection: IListenable<any>): void;
    private static debugDataInternal;
    static readonly DebugData: IListenableObject<IListenableArray<DebugEvent>>;
    static logDebugMutation(label: string, mutation: Mutation<any>): void;
}
