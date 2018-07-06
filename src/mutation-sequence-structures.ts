/**
 * Data structure used by ArrayMutationSequence to map indices to Symbol values that will stay
 * constant even as the indices are shifted around by insertion and deletion operations.
 */
export class SymbolIndexMap {
    private symbols: symbol[] = [];
    private offsetsMap = new OffsetsMap();

    getSymbolForIndex(index: number) {
        while (index >= this.symbols.length) {
            this.symbols.push(Symbol());
        }
        return this.symbols[index];
    }

    getIndexForSymbol(symbol: symbol) {
        return this.symbols.findIndex((local) => local === symbol);
    }

    getLookupMap() {
        const symbolToIndex = new Map<symbol, number>();
        for (let i = 0; i < this.symbols.length; i++) {
            symbolToIndex.set(this.symbols[i], i);
        }
        return symbolToIndex;
    }

    getOriginalIndexAt(index: number) {
        return index + this.offsetsMap.getTotalOffsetAt(index);
    }

    shift(startIndex: number, shiftBy: number) {
        this.offsetsMap.addOffset(startIndex, -shiftBy);
        if (shiftBy > 0) {
            const spliceArgs: any[] = [startIndex, 0];
            for (let i = 0; i < shiftBy; i++) {
                spliceArgs.push(Symbol());
            }
            Array.prototype.splice.apply(this.symbols, spliceArgs);
        } else if (shiftBy < 0) {
            this.symbols.splice(startIndex, -shiftBy);
        }
    }
}

/**
 * Data structure used by SymbolIndexMap to track the offsets of each symbol from the original
 * array using an ordered list of offsets.
 */
class OffsetsMap {
    private map: {index: number, offset: number}[] = [];

    addOffset(index: number, offset: number) {
        let insertionIndex = 0;
        for (; insertionIndex <= this.map.length; insertionIndex++) {
            const currentItem = this.map[insertionIndex];
            if (!currentItem) break;
            if (currentItem.index == index) {
                currentItem.offset += offset;
                return;
            } else if (currentItem.index > index) {
                break;
            }
        }

        this.map.splice(insertionIndex, 0, {index, offset});
    }

    getTotalOffsetAt(index: number) {
        let acc = 0;
        for (let i = 0; i < this.map.length; i++) {
            if (this.map[i].index > index) {
                return acc;
            }
            acc += this.map[i].offset;
        }
        return acc;
    }
}