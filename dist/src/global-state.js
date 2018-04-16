"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const make_listenable_1 = require("./make-listenable");
/**
 * Global state used to track getter calls for computed values.
 */
class EpoxyGlobalState {
    static registerGetterCall(collection, key) {
        if (!EpoxyGlobalState.trackingGetters)
            return;
        EpoxyGlobalState.consumedGetters.push({ collection, key });
    }
    static trackGetters(run) {
        if (EpoxyGlobalState.trackingGetters) {
            throw new Error('Cannot create a computed property within another computed property');
        }
        EpoxyGlobalState.consumedGetters = [];
        EpoxyGlobalState.trackingGetters = true;
        run();
        EpoxyGlobalState.trackingGetters = false;
        const ret = new Map();
        for (const getter of EpoxyGlobalState.consumedGetters) {
            if (!ret.has(getter.collection)) {
                ret.set(getter.collection, new Set());
            }
            ret.get(getter.collection).add(getter.key);
        }
        return ret;
    }
    static get isBatching() {
        return this._isBatching;
    }
    static set isBatching(newIsBatching) {
        if (this._isBatching && !newIsBatching) {
            this.changedInBatch.forEach((collection) => collection.broadcastCurrentValue());
        }
        this._isBatching = newIsBatching;
    }
    static markChangedDuringBatch(collection) {
        this.changedInBatch.add(collection);
    }
    // DEBUGGING TOOLS
    static get DebugData() {
        return make_listenable_1.makeListenable({});
    }
    static logDebugMutation(label, mutation) {
        if (!EpoxyGlobalState.DebugData.hasOwnProperty(label)) {
            EpoxyGlobalState.DebugData[label] = make_listenable_1.makeListenable([]);
        }
        EpoxyGlobalState.DebugData[label].push(mutation);
    }
}
// GETTER TRACKING
EpoxyGlobalState.trackingGetters = false;
EpoxyGlobalState.consumedGetters = [];
// OPERATION BATCHING
EpoxyGlobalState.changedInBatch = new Set();
exports.EpoxyGlobalState = EpoxyGlobalState;
