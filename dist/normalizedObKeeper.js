"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genericObKeeper_1 = require("./genericObKeeper");
const _ = require("lodash");
function normalizedObToStandardOb(v) {
    return { r: v[0], a: v[1] };
}
exports.normalizedObToStandardOb = normalizedObToStandardOb;
class NormalizedObKeeper extends genericObKeeper_1.GenericObKeeper {
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { data } = res;
            this.onReceiveOb({
                isNewSnapshot: data.e === 's',
                pair: data.pair || data.c.toString(),
                bids: _.map(data.b, normalizedObToStandardOb),
                asks: _.map(data.a, normalizedObToStandardOb),
            });
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.NormalizedObKeeper = NormalizedObKeeper;
