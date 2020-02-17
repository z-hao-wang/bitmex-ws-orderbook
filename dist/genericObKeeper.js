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
const baseKeeper_1 = require("./baseKeeper");
const genericObKeeperShared_1 = require("./utils/genericObKeeperShared");
class GenericObKeeper extends baseKeeper_1.BaseKeeper {
    constructor() {
        super(...arguments);
        this.obKeepers = {};
    }
    // if initial, return true
    onReceiveOb(params) {
        const { pair, bids, asks } = params;
        if (!this.obKeepers[pair]) {
            this.obKeepers[pair] = new genericObKeeperShared_1.GenericObKeeperShared();
        }
        this.obKeepers[pair].onReceiveOb({ bids, asks });
        if (this.enableEvent) {
            this.emit(`orderbook`, this.getOrderBookWs(pair));
        }
    }
    getOrderBookWs(pair) {
        const orderbooks = Object.assign({ ts: new Date(), pair }, this.obKeepers[pair].getOb());
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
exports.GenericObKeeper = GenericObKeeper;
