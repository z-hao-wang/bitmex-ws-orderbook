"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genericObKeeper_1 = require("./genericObKeeper");
const _ = require("lodash");
function phemexToStandardOb(v) {
    return { r: v[0] / 10000, a: v[1] };
}
exports.phemexToStandardOb = phemexToStandardOb;
class PhemexObKeeper extends genericObKeeper_1.GenericObKeeper {
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { book, symbol } = res;
            if (book) {
                this.onReceiveOb({
                    pair: symbol,
                    bids: _.map(book.bids, phemexToStandardOb),
                    asks: _.map(book.asks, phemexToStandardOb),
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.PhemexObKeeper = PhemexObKeeper;
