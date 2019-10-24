"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isObPriceEqual(ob1, ob2) {
    if (ob1.r !== ob2.r)
        return false;
    return true;
}
exports.isObPriceEqual = isObPriceEqual;
function isObAmountEqual(ob1, ob2) {
    return Math.abs(ob1.a - ob2.a) <= 0.0001;
}
exports.isObAmountEqual = isObAmountEqual;
function isObItemEqual(ob1, ob2) {
    return isObPriceEqual(ob1, ob2) && isObAmountEqual;
}
exports.isObItemEqual = isObItemEqual;
function verifyObPollVsObWs(obPoll, obWs) {
    if (!obPoll) {
        console.error(`obPoll is null`);
        return 0;
    }
    if (!obWs) {
        console.error(`obWs is null`);
        return 0;
    }
    let askPriceDiffPercent = 0;
    if (!isObPriceEqual(obPoll.asks[0], obWs.asks[0])) {
        // logger.warn(`obPoll obWs asks price not equal ${obPoll.asks[0].r} ${obWs.asks[0].r}`);
        askPriceDiffPercent = Math.abs(obPoll.asks[0].r - obWs.asks[0].r) / obWs.asks[0].r;
        if (askPriceDiffPercent > 0.002) {
            console.error(`obPoll obWs asks price diff too much ${obPoll.asks[0].r} ${obWs.asks[0].r}`);
        }
    }
    let bidPriceDiffPercent = 0;
    if (!isObPriceEqual(obPoll.bids[0], obWs.bids[0])) {
        // logger.warn(`obPoll obWs bids price not equal ${obPoll.bids[0].r} ${obWs.bids[0].r}`);
        const bidPriceDiffPercent = Math.abs(obPoll.bids[0].r - obWs.bids[0].r) / obWs.bids[0].r;
        if (bidPriceDiffPercent > 0.01) {
            console.error(`obPoll obWs bids price diff too much ${obPoll.bids[0].r} ${obWs.bids[0].r}`);
        }
    }
    return Math.max(bidPriceDiffPercent, askPriceDiffPercent);
}
exports.verifyObPollVsObWs = verifyObPollVsObWs;
function sortOrderBooks(orderBooks) {
    return Object.assign({}, orderBooks, { bids: sortByDesc(orderBooks.bids, 'r'), asks: sortByAsc(orderBooks.asks, 'r') });
}
exports.sortOrderBooks = sortOrderBooks;
function sortByAsc(items, key) {
    if (key) {
        return items.sort((a, b) => a[key] - b[key]);
    }
    return items.sort((a, b) => a - b);
}
exports.sortByAsc = sortByAsc;
function sortByDesc(items, key) {
    if (key) {
        return items.sort((a, b) => b[key] - a[key]);
    }
    return items.sort((a, b) => b - a);
}
exports.sortByDesc = sortByDesc;
