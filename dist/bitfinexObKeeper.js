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
class BitfinexObKeeper extends baseKeeper_1.BaseKeeper {
    constructor() {
        super(...arguments);
        this.obCache = {};
    }
    // if initial, return true
    onReceiveOb(pair, _data) {
        if (!this.obCache[pair]) {
            this.obCache[pair] = _data.slice(0);
            return true;
        }
        else {
            // update ob in matching price
            const cache = this.obCache[pair];
            // this is not very efficient, but it can get things done
            const data = _data;
            const price = data[0];
            const count = data[1];
            const amount = data[2];
            if (amount > 0) {
                // search from top.
                for (let i = 0; i < cache.length; i++) {
                    if (cache[i][2] < 0) {
                        // searched all list, but non found, means this price must be lower than all of the bids, insert at last
                        cache.splice(i, 0, data);
                        break;
                    }
                    if (cache[i][0] === price) {
                        if (count > 0) {
                            cache[i][1] = data[1];
                            cache[i][2] = data[2];
                        }
                        else if (count === 0) {
                            cache.splice(i, 1);
                        }
                        break;
                    }
                    else if (count > 0 && cache[i][0] < price) {
                        // price ordered from high to low, when we met a price that is lower, must insert into book
                        cache.splice(i, 0, data);
                        break;
                    }
                }
            }
            else {
                for (let i = cache.length - 1; i >= 0; i--) {
                    if (cache[i][2] > 0) {
                        cache.splice(i + 1, 0, data);
                        break;
                    }
                    if (cache[i][0] === price) {
                        if (count > 0) {
                            cache[i][1] = data[1];
                            cache[i][2] = data[2];
                        }
                        else if (count === 0) {
                            cache.splice(i, 1);
                        }
                        break;
                    }
                    else if (cache[i][0] < price && count > 0) {
                        // price ordered from high to low in reversed order, when we met a price that is lower, must insert into book
                        if (i === cache.length - 1) {
                            cache.push(data);
                        }
                        else {
                            cache.splice(i + 1, 0, data);
                        }
                        break;
                    }
                }
            }
            if (this.enableEvent) {
                this.emit(`orderbook`, this.getOrderBookWs(pair));
            }
            return false;
        }
    }
    formatOrderBookItem(orderBookItem) {
        return {
            r: orderBookItem[0],
            a: Math.abs(orderBookItem[2]),
        };
    }
    getOrderBookWs(pair) {
        const orderbooks = {
            ts: new Date(),
            pair,
            bids: _.filter(this.obCache[pair], ob => ob[2] > 0).map(this.formatOrderBookItem),
            asks: _.filter(this.obCache[pair], ob => ob[2] < 0).map(this.formatOrderBookItem),
        };
        if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
            console.error(`bitfinex invalid bids or asks this.obCache[pair] ${pair}`, this.obCache[pair]);
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
exports.BitfinexObKeeper = BitfinexObKeeper;
