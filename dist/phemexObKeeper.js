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
            const { book, symbol, type } = res;
            if (book) {
                this.onReceiveObRaw({
                    pair: symbol,
                    book,
                    type,
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    onReceiveObRaw(params) {
        this.onReceiveOb({
            pair: params.pair,
            bids: _.map(params.book.bids, phemexToStandardOb),
            asks: _.map(params.book.asks, phemexToStandardOb),
            isNewSnapshot: params.type === 'snapshot'
        });
    }
}
exports.PhemexObKeeper = PhemexObKeeper;
