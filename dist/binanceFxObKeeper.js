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
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { data } = res;
            if (data.e === 'depthUpdate') {
                this.onReceiveOb({
                    pair: data.s.toUpperCase(),
                    bids: _.map(data.b, binanceObToStandardOb),
                    asks: _.map(data.a, binanceObToStandardOb),
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.BinanceFxObKeeper = BinanceFxObKeeper;
