"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genericObKeeper_1 = require("./genericObKeeper");
const _ = require("lodash");
const autoParseFloat = (v) => (_.isString(v) ? parseFloat(v) : v);
function binanceObToStandardOb(v) {
    return { r: autoParseFloat(v[0]), a: autoParseFloat(v[1]) };
}
exports.binanceObToStandardOb = binanceObToStandardOb;
class BinanceFxObKeeper extends genericObKeeper_1.GenericObKeeper {
    onSocketMessage(msg, pairDb) {
        try {
            const data = _.isString(msg) ? JSON.parse(msg) : msg;
            if (data.e === 'depthUpdate') {
                // some delete are always in bid, but should be in ask instead
                const bids = _.map(data.b, binanceObToStandardOb);
                const asks = _.map(data.a, binanceObToStandardOb);
                const pair = pairDb || data.s.toUpperCase();
                const currentOb = this.getOrderBookWs(pair);
                for (let bid of bids) {
                    if (currentOb.asks[0] && bid.a === 0 && bid.r >= currentOb.asks[0].r) {
                        asks.push(bid);
                        // console.log(`BinanceFxObKeeper moving bid ${JSON.stringify(bid)} to ask topAsk=${currentOb.asks[0].r}`);
                    }
                }
                for (let ask of asks) {
                    if (currentOb.bids[0] && ask.a === 0 && ask.r <= currentOb.bids[0].r) {
                        bids.push(ask);
                        // console.log(`BinanceFxObKeeper moving ask ${JSON.stringify(ask)} to bid topBid=${currentOb.bids[0].r}`);
                    }
                }
                this.onReceiveOb({
                    pair,
                    bids,
                    asks,
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.BinanceFxObKeeper = BinanceFxObKeeper;
