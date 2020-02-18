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
class BitmexOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super(options);
        this.storedObs = {};
        this.storedObsOrdered = {};
        this.currentSplitIndex = 0;
        this.name = 'bitmexObKeeper';
        this.VERIFY_OB_PERCENT = 0;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.bitmexRequest = new bitmex_request_1.BitmexRequest({ testnet: this.testnet });
        this.initLogger();
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
        this.storedObs[pair] = this.storedObs[pair] || {};
        this.storedObsOrdered[pair] = this.storedObsOrdered[pair] || [];
        if (_.includes(['partial', 'insert'], action)) {
            // first init, refresh ob data.
            _.each(obRows, row => {
                this.storedObs[pair][String(row.id)] = row;
                const newRowRef = this.storedObs[pair][String(row.id)];
                if (this.storedObsOrdered[pair].length === 0) {
                    this.storedObsOrdered[pair].push(newRowRef);
                }
                else if (row.price > _.last(this.storedObsOrdered[pair]).price) {
                    this.storedObsOrdered[pair].push(newRowRef);
                }
                else if (row.price < _.first(this.storedObsOrdered[pair]).price) {
                    this.storedObsOrdered[pair].unshift(newRowRef);
                }
                else {
                    for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
                        if (row.price === this.storedObsOrdered[pair][i].price) {
                            this.storedObsOrdered[pair][i] = newRowRef;
                            break;
                        }
                        else if (row.price < this.storedObsOrdered[pair][i].price) {
                            this.storedObsOrdered[pair].splice(i, 0, newRowRef);
                            break;
                        }
                    }
                }
                // ensure the data is ordered
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
                    this.storedObs[pair][String(row.id)].size = row.size;
                    if (this.storedObs[pair][String(row.id)].side !== row.side) {
                        this.storedObs[pair][String(row.id)].side = row.side;
                        this.currentSplitIndex = this.storedObs[pair][String(row.id)].idx;
                    }
                }
                else {
                    const errMsg = `${this.name} update ${row.id} does not exist in currentObMap`;
                    this.logger.error(errMsg);
                    this.emit(`error`, errMsg);
                }
            });
        }
        else if (action === 'delete') {
            _.each(obRows, row => {
                const idx = this.storedObs[pair][String(row.id)].idx;
                this.storedObsOrdered[pair][idx].size = 0;
                delete this.storedObs[pair][String(row.id)];
            });
        }
    }
    getOrderBookRaw(pair) {
        return this.storedObs[pair];
    }
    getOrderBookWs(pair, depth = 5) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        if (1) {
            const bidI = this.findBestBid(pair).i;
            const askI = this.findBestAsk(pair).i;
            const asks = [];
            const bids = [];
            const storedOrdered = this.storedObsOrdered[pair];
            for (let i = bidI; i >= 0 && bids.length < depth; i--) {
                const item = storedOrdered[i];
                if (item.size > 0) {
                    bids.push({
                        r: item.price,
                        a: item.size,
                    });
                }
            }
            for (let i = askI; i <= storedOrdered.length && asks.length < depth; i++) {
                const item = storedOrdered[i];
                if (item.size > 0) {
                    asks.push({
                        r: item.price,
                        a: item.size,
                    });
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
            const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
            const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
            const bids = _.map(parsingUtils_1.sortByDesc(bidsUnsortedRaw, 'price').slice(0, depth), d => ({
                r: d.price,
                a: d.size,
            }));
            const asks = _.map(parsingUtils_1.sortByAsc(askUnsortedRaw, 'price').slice(0, depth), d => ({
                r: d.price,
                a: d.size,
            }));
            return {
                pair,
                ts: this.lastObWsTime,
                bids,
                asks,
            };
        }
    }
    findBestBid(pair) {
        let i = this.currentSplitIndex;
        const sideSplit = this.storedObsOrdered[pair][this.currentSplitIndex].side;
        if (sideSplit === 'Buy') {
            // go down until we see Sell
            while (i < this.storedObsOrdered[pair].length && this.storedObsOrdered[pair][i].side === 'Buy') {
                i++;
            }
            return { i: i - 1, bid: this.storedObsOrdered[pair][i - 1] };
        }
        else {
            // go up until we see first buy
            while (i > 0 && this.storedObsOrdered[pair][i].side === 'Sell') {
                i--;
            }
            return { i: i, bid: this.storedObsOrdered[pair][i] };
        }
    }
    findBestAsk(pair) {
        let i = this.currentSplitIndex;
        const sideSplit = this.storedObsOrdered[pair][this.currentSplitIndex].side;
        if (sideSplit === 'Buy') {
            // go down until we see Sell
            while (i < this.storedObsOrdered[pair].length && this.storedObsOrdered[pair][i].side === 'Buy') {
                i++;
            }
            return { i: i, ask: this.storedObsOrdered[pair][i] };
        }
        else {
            // go up until we see first buy
            while (i >= 0 && this.storedObsOrdered[pair][i].side === 'Sell') {
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
