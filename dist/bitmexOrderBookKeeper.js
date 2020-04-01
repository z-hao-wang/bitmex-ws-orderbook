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
const searchUtils_1 = require("./utils/searchUtils");
// new method is much much faster than old one
const USING_NEW_METHOD = true;
class BitmexOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super(options);
        this.storedObs = {};
        this.storedObsOrdered = {};
        this.currentSplitIndex = {};
        this.verifyWithOldMethod = false;
        this.name = 'bitmexObKeeper';
        this.VERIFY_OB_PERCENT = 0;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.bitmexRequest = new bitmex_request_1.BitmexRequest({ testnet: this.testnet });
        this.initLogger();
        this.verifyWithOldMethod = options.verifyWithOldMethod || false;
    }
    bitmexObToInternalOb(ob) {
        return {
            s: ob.side === 'Buy' ? 0 : 1,
            r: ob.price,
            a: ob.size,
            id: ob.id,
        };
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { table, action, data } = res;
            // this logic is similar with transaction_flow/ob_bitmex_fx.ts
            if (table === 'orderBookL2_25') {
                if (data.length === 0) {
                    this.logger.warn(`_saveWsObData empty obRows`);
                    return;
                }
                const pair = data[0].symbol;
                this.onReceiveOb(data, action, pair);
                this.lastObWsTime = new Date();
                if (this.enableEvent) {
                    this.emit(`orderbook`, this.getOrderBookWs(pair));
                }
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    // directly use this for process backtesting data.
    onReceiveOb(obRows, action, pair) {
        if (action === 'partial') {
            // this means the websocket is probably reinitialized. we need to reconstruct the whole orderbook
            this.storedObs[pair] = {};
            this.storedObsOrdered[pair] = [];
        }
        this.storedObs[pair] = this.storedObs[pair] || {};
        this.storedObsOrdered[pair] = this.storedObsOrdered[pair] || [];
        if (_.includes(['partial', 'insert'], action)) {
            // first init, refresh ob data.
            _.each(obRows, row => {
                this.storedObs[pair][String(row.id)] = this.bitmexObToInternalOb(row);
                const newRowRef = this.storedObs[pair][String(row.id)];
                if (this.storedObsOrdered[pair].length === 0) {
                    this.storedObsOrdered[pair].push(newRowRef);
                }
                else if (row.price > _.last(this.storedObsOrdered[pair]).r) {
                    this.storedObsOrdered[pair].push(newRowRef);
                }
                else if (row.price < _.first(this.storedObsOrdered[pair]).r) {
                    this.storedObsOrdered[pair].unshift(newRowRef);
                }
                else {
                    // try to find the price using binary search first. slightly faster.
                    const foundIndex = action === 'insert' ? searchUtils_1.sortedFindIndex(this.storedObsOrdered[pair], row.price, x => x.r) : -1;
                    if (foundIndex !== -1) {
                        this.storedObsOrdered[pair][foundIndex] = newRowRef;
                    }
                    else {
                        // if not found, insert with new price.
                        for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
                            if (row.price < this.storedObsOrdered[pair][i].r) {
                                this.storedObsOrdered[pair].splice(i, 0, newRowRef);
                                break;
                            }
                        }
                    }
                }
                // ensure the data is ordered (DEBUG only)
                // for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
                //   if (i > 0 && this.storedObsOrdered[pair][i].price < this.storedObsOrdered[pair][i - 1].price) {
                //     console.error(`invalid order, `, this.storedObsOrdered[pair])
                //   }
                // }
            });
            // reverse build index
            _.each(this.storedObsOrdered[pair], (o, i) => {
                // undefined is allowed due to it can be deleted
                if (this.storedObs[pair][String(o.id)]) {
                    this.storedObs[pair][String(o.id)].idx = i;
                }
            });
        }
        else if (action === 'update') {
            // if this order exists, we update it, otherwise don't worry
            _.each(obRows, row => {
                if (this.storedObs[pair][String(row.id)]) {
                    // must update one by one because update doesn't contain price
                    const obRowInternal = this.bitmexObToInternalOb(row);
                    this.storedObs[pair][String(row.id)].a = obRowInternal.a;
                    if (this.storedObs[pair][String(row.id)].s !== obRowInternal.s) {
                        this.storedObs[pair][String(row.id)].s = obRowInternal.s;
                        this.currentSplitIndex[pair] = this.storedObs[pair][String(row.id)].idx;
                    }
                }
                else {
                    const errMsg = `${this.name} update ${row.id} does not exist in currentObMap`;
                    if (!this.silentMode) {
                        this.logger.error(errMsg);
                    }
                    this.emit(`error`, errMsg);
                }
            });
        }
        else if (action === 'delete') {
            _.each(obRows, row => {
                if (this.storedObs[pair][String(row.id)]) {
                    const idx = this.storedObs[pair][String(row.id)].idx;
                    this.storedObsOrdered[pair][idx].a = 0;
                    delete this.storedObs[pair][String(row.id)];
                }
            });
        }
    }
    getSplitIndex(pair) {
        if (!this.currentSplitIndex[pair]) {
            return Math.floor(this.storedObsOrdered[pair].length / 2);
        }
        return this.currentSplitIndex[pair];
    }
    getOrderBookRaw(pair) {
        return this.storedObs[pair];
    }
    getOrderBookWsOld(pair, depth = 25) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        // old method, slow
        const bidsUnsortedRaw = _.filter(dataRaw, o => o.s === 0 && o.a > 0);
        const askUnsortedRaw = _.filter(dataRaw, o => o.s === 1 && o.a > 0);
        const bids = _.map(parsingUtils_1.sortByDesc(bidsUnsortedRaw, 'r').slice(0, depth), d => ({
            r: d.r,
            a: d.a,
        }));
        const asks = _.map(parsingUtils_1.sortByAsc(askUnsortedRaw, 'r').slice(0, depth), d => ({
            r: d.r,
            a: d.a,
        }));
        return {
            pair,
            ts: this.lastObWsTime,
            bids,
            asks,
        };
    }
    getOrderBookWs(pair, depth = 25) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        if (USING_NEW_METHOD) {
            const bidI = this.findBestBid(pair).i;
            const askI = this.findBestAsk(pair).i;
            const asks = [];
            const bids = [];
            const storedOrdered = this.storedObsOrdered[pair];
            for (let i = bidI; i >= 0 && bids.length < depth; i--) {
                const item = storedOrdered[i];
                if (item.a > 0) {
                    bids.push({
                        r: item.r,
                        a: item.a,
                    });
                }
            }
            for (let i = askI; i < storedOrdered.length && asks.length < depth; i++) {
                const item = storedOrdered[i];
                if (item.a > 0) {
                    asks.push({
                        r: item.r,
                        a: item.a,
                    });
                }
            }
            if (this.verifyWithOldMethod) {
                const oldOb = this.getOrderBookWsOld(pair, depth);
                if (oldOb.asks[0].r !== asks[0].r) {
                    console.error(`unmatching ob asks`, oldOb.asks, storedOrdered);
                }
                if (oldOb.bids[0].r !== bids[0].r) {
                    console.error(`unmatching ob bids`, oldOb.bids, bids);
                }
            }
            return {
                pair,
                ts: this.lastObWsTime,
                bids,
                asks,
            };
        }
        else {
            // old method, slow
            return this.getOrderBookWsOld(pair, depth);
        }
    }
    findBestBid(pair) {
        const splitIndex = this.getSplitIndex(pair);
        let i = splitIndex;
        if (!this.storedObsOrdered[pair][splitIndex]) {
            this.logger.error(`invalid splitIndex=${splitIndex}`);
            throw new Error(`invalid splitIndex=${splitIndex}`);
        }
        const sideSplit = this.storedObsOrdered[pair][splitIndex].s;
        if (sideSplit === 0) {
            // go down until we see Sell
            while (i < this.storedObsOrdered[pair].length &&
                (this.storedObsOrdered[pair][i].s === 0 || this.storedObsOrdered[pair][i].a === 0)) {
                i++;
            }
            return { i: i - 1, bid: this.storedObsOrdered[pair][i - 1] };
        }
        else {
            // go up until we see first buy
            while (i > 0 && (this.storedObsOrdered[pair][i].s === 1 || this.storedObsOrdered[pair][i].a === 0)) {
                i--;
            }
            return { i: i, bid: this.storedObsOrdered[pair][i] };
        }
    }
    findBestAsk(pair) {
        const splitIndex = this.getSplitIndex(pair);
        let i = splitIndex;
        const sideSplit = this.storedObsOrdered[pair][splitIndex].s;
        if (sideSplit === 0) {
            // go down until we see Sell
            while (i < this.storedObsOrdered[pair].length &&
                (this.storedObsOrdered[pair][i].s === 0 || this.storedObsOrdered[pair][i].a === 0)) {
                i++;
            }
            return { i: i, ask: this.storedObsOrdered[pair][i] };
        }
        else {
            // go up until we see first buy
            while (i >= 0 && (this.storedObsOrdered[pair][i].s === 1 || this.storedObsOrdered[pair][i].a === 0)) {
                i--;
            }
            return { i: i + 1, ask: this.storedObsOrdered[pair][i + 1] };
        }
    }
    pollOrderBook(pairEx) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.bitmexRequest.pollOrderBook(pairEx);
        });
    }
    // Get WS ob, and fall back to poll. also verify ws ob with poll ob
    getOrderBook(pairEx, forcePoll) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
                if (!forcePoll)
                    this.logger.warn(`lastObWsTime=${this.lastObWsTime} is outdated, polling instead`);
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
exports.BitmexOrderBookKeeper = BitmexOrderBookKeeper;
