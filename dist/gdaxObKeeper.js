"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const baseKeeper_1 = require("./baseKeeper");
const genericObKeeperShared_1 = require("./utils/genericObKeeperShared");
class GdaxObKeeper extends baseKeeper_1.BaseKeeper {
    constructor() {
        super(...arguments);
        this.obKeepers = {};
    }
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { type, product_id: pair } = res;
            // this logic is similar with transaction_flow/ob_bitmex_fx.ts
            if (type === 'snapshot') {
                this.onReceiveOb({ pair, bids: _.map(res.bids, b => this.convertToObSchema(b)),
                    asks: _.map(res.asks, b => this.convertToObSchema(b)), });
            }
            else if (type === 'l2update') {
                this.performObUpdate(res);
            }
            else {
                this.logger.error(`unknown type ${type}`);
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    onReceiveOb(params) {
        const { pair, bids, asks, isNewSnapshot } = params;
        if (!this.obKeepers[pair]) {
            this.obKeepers[pair] = new genericObKeeperShared_1.GenericObKeeperShared();
        }
        if (isNewSnapshot) {
            this.obKeepers[pair].init();
        }
        this.obKeepers[pair].onReceiveOb({ bids, asks });
        if (this.enableEvent) {
            this.emit(`orderbook`, this.getOrderBookWs(pair));
        }
    }
    convertToObSchema(item) {
        return {
            r: parseFloat(item[0]),
            a: parseFloat(item[1]),
        };
    }
    performObUpdate(data) {
        const pair = data.product_id;
        const { changes } = data;
        _.each(changes, change => {
            const side = change[0];
            const price = parseFloat(change[1]);
            const amount = parseFloat(change[2]);
            const bids = side === 'buy' ? [{ r: price, a: amount }] : [];
            const asks = side === 'sell' ? [{ r: price, a: amount }] : [];
            this.obKeepers[pair].onReceiveOb({ bids, asks });
        });
    }
    formatOrderBookItem(orderBookItem) {
        return {
            r: orderBookItem[0],
            a: orderBookItem[1],
        };
    }
    getOrderBookWs(pair, depth = 25) {
        const orderbooks = Object.assign(Object.assign({}, this.obKeepers[pair].getOb(depth)), { ts: new Date(), pair });
        if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
            this.logger.error(`coinbase invalid bids or asks this.obCache[pair] ${pair}`);
        }
        this.lastObWsTime = new Date();
        return orderbooks;
    }
    // fallback polling not implemented
    getOrderBook(pair) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getOrderBookWs(pair);
        });
    }
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
    }
}
exports.GdaxObKeeper = GdaxObKeeper;
