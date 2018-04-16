import { ListenableCollection, IListenableObject, IListenableArray, IListenable } from './types';
import { Mutation } from './mutations';
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
    static readonly DebugData: IListenableObject<IListenableArray<Mutation<any>>>;
    static logDebugMutation(label: string, mutation: Mutation<any>): void;
}
