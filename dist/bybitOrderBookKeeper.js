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
const bitmex_request_1 = require("bitmex-request");
const traderUtils = require("./utils/traderUtils");
const parsingUtils_1 = require("./utils/parsingUtils");
const baseKeeper_1 = require("./baseKeeper");
const genericObKeeperShared_1 = require("./utils/genericObKeeperShared");
class BybitOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super(options);
        this.obKeepers = {};
        this.name = 'bybitObKeeper';
        this.VERIFY_OB_PERCENT = 0.1;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.bybitRequest = new bitmex_request_1.BybitRequest({ testnet: this.testnet });
        this.initLogger();
    }
    // if initial, return true
    onReceiveObShared(params) {
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
    getOrderBookWs(pair, depth) {
        if (!this.obKeepers[pair]) {
            return {
                ts: new Date(),
                pair,
                bids: [],
                asks: [],
            };
        }
        const orderbooks = Object.assign({ ts: new Date(), pair }, this.obKeepers[pair].getOb(depth));
        return orderbooks;
    }
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const pairMatch = res && res.topic.match(/^orderBookL2_25\.(.*)/);
            const pair = pairMatch && pairMatch[1];
            if (pair) {
                this.lastObWsTime = new Date();
                this.onReceiveOb(res);
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    onReceiveOb(obs, _pair) {
        // for rebuilding orderbook process.
        if (_.includes(['snapshot'], obs.type)) {
            // first init, refresh ob data.
            const obRows = obs.data;
            const pair = _pair || obRows[0].symbol;
            const bids = [];
            const asks = [];
            _.each(obRows, row => {
                if (row.side === 'Buy') {
                    bids.push({ r: parseFloat(row.price), a: row.size });
                }
                else {
                    asks.push({ r: parseFloat(row.price), a: row.size });
                }
            });
            this.onReceiveObShared({ pair, bids, asks, isNewSnapshot: true });
        }
        else if (obs.type === 'delta') {
            const { insert, update, delete: deleted } = obs.data;
            if (insert && insert.length > 0) {
                const pair = _pair || insert[0].symbol;
                const bids = [];
                const asks = [];
                _.each(insert, row => {
                    if (row.side === 'Buy') {
                        bids.push({ r: parseFloat(row.price), a: row.size });
                    }
                    else {
                        asks.push({ r: parseFloat(row.price), a: row.size });
                    }
                });
                this.onReceiveObShared({ pair, bids, asks });
            }
            if (update && update.length > 0) {
                const pair = _pair || update[0].symbol;
                const bids = [];
                const asks = [];
                _.each(update, row => {
                    if (row.side === 'Buy') {
                        bids.push({ r: parseFloat(row.price), a: row.size });
                    }
                    else {
                        asks.push({ r: parseFloat(row.price), a: row.size });
                    }
                });
                this.onReceiveObShared({ pair, bids, asks });
            }
            if (deleted && deleted.length > 0) {
                const pair = _pair || deleted[0].symbol;
                const bids = [];
                const asks = [];
                _.each(deleted, row => {
                    if (row.side === 'Buy') {
                        bids.push({ r: parseFloat(row.price), a: 0 });
                    }
                    else {
                        asks.push({ r: parseFloat(row.price), a: 0 });
                    }
                });
                this.onReceiveObShared({ pair, bids, asks });
            }
        }
        if (this.enableEvent) {
            const pair = _pair || obs.topic.match(/orderBookL2_25\.(.*)/)[1];
            this.emit(`orderbook`, this.getOrderBookWs(pair));
        }
    }
    pollOrderBook(pairEx) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.bybitRequest.pollOrderBook(pairEx);
        });
    }
    // Get WS ob, and fall back to poll. also verify ws ob with poll ob
    getOrderBook(pairEx, forcePoll) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
                if (!forcePoll)
                    this.logger.warn(`lastObWsTime=${this.lastObWsTime && this.lastObWsTime.toISOString()} is outdated diff=(${Date.now() -
                        (this.lastObWsTime ? this.lastObWsTime.getTime() : 0)}), polling instead`);
                return yield this.pollOrderBookWithRateLimit(pairEx);
            }
            let obPoll;
            const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
            if (verifyWithPoll) {
                obPoll = yield this.pollOrderBookWithRateLimit(pairEx);
            }
            const obFromRealtime = this.getOrderBookWs(pairEx);
            if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
                if (verifyWithPoll) {
                    parsingUtils_1.verifyObPollVsObWs(obPoll, obFromRealtime);
                }
                return obFromRealtime;
            }
            this.logger.warn(`orderbookws not available, polling instead obWs=${obFromRealtime}`);
            if (obPoll) {
                return obPoll;
            }
            return yield this.pollOrderBookWithRateLimit(pairEx);
        });
    }
}
exports.BybitOrderBookKeeper = BybitOrderBookKeeper;
