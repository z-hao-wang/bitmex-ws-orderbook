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
class GdaxObKeeper extends baseKeeper_1.BaseKeeper {
    constructor() {
        super(...arguments);
        this.obCache = {};
    }
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { type, product_id: pair } = res;
            // this logic is similar with transaction_flow/ob_bitmex_fx.ts
            if (type === 'snapshot') {
                this.obCache[pair] = {
                    bids: _.map(res.bids, b => this.convertToNum(b)),
                    asks: _.map(res.asks, b => this.convertToNum(b)),
                };
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
    convertToNum(items) {
        return _.map(items, b => parseFloat(b));
    }
    performObUpdate(data) {
        const pair = data.product_id;
        if (!this.obCache[pair]) {
            throw new Error(`gdax ob keeper invalid pair ${pair}, no existing data`);
        }
        const { changes } = data;
        _.each(changes, change => {
            const side = change[0];
            const price = parseFloat(change[1]);
            const amount = parseFloat(change[2]);
            if (side === 'buy') {
                const obs = this.obCache[pair].bids;
                let foundMatch = false;
                for (let i = 0; i < obs.length; i++) {
                    if (obs[i][0] === price) {
                        if (amount > 0) {
                            // replace
                            obs[i][1] = amount;
                        }
                        else {
                            //delete
                            obs.splice(i, 1);
                        }
                        foundMatch = true;
                        break;
                    }
                    else if (amount > 0 && obs[i][0] < price) {
                        // price ordered from high to low (decending), when we met a price that is higher, must insert into book at this location
                        obs.splice(i, 0, [price, amount]);
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch) {
                    // this means we need to insert item at bottom
                    obs.push([price, amount]);
                }
            }
            else if (side === 'sell') {
                const obs = this.obCache[pair].asks;
                let foundMatch = false;
                for (let i = 0; i < obs.length; i++) {
                    if (obs[i][0] === price) {
                        if (amount > 0) {
                            // replace
                            obs[i][1] = amount;
                        }
                        else {
                            //delete
                            obs.splice(i, 1);
                        }
                        foundMatch = true;
                        break;
                    }
                    else if (amount > 0 && obs[i][0] > price) {
                        // price ordered from low to high (ascending), when we met a price that is lower, must insert into book at this location
                        obs.splice(i, 0, [price, amount]);
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch) {
                    // insert at bottom of book
                    obs.push([price, amount]);
                }
            }
        });
    }
    formatOrderBookItem(orderBookItem) {
        return {
            r: orderBookItem[0],
            a: orderBookItem[1],
        };
    }
    getOrderBookWs(pair) {
        const orderbooks = {
            ts: new Date(),
            pair,
            bids: this.obCache[pair].bids.map(this.formatOrderBookItem),
            asks: this.obCache[pair].asks.map(this.formatOrderBookItem),
        };
        if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
            this.logger.error(`coinbase invalid bids or asks this.obCache[pair] ${pair}`, this.obCache[pair]);
        }
        this.lastObWsTime = new Date();
        return orderbooks;
    }
    // fallback polling not implmented
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
