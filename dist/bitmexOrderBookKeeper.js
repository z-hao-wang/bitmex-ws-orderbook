"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const bitmexRequest_1 = require("./utils/bitmexRequest");
const traderUtils = require("./utils/traderUtils");
const parsingUtils_1 = require("./utils/parsingUtils");
const EventEmitter = require("events");
function sortByAsc(items, key) {
    if (key) {
        return items.sort((a, b) => a[key] - b[key]);
    }
    return items.sort((a, b) => a - b);
}
exports.sortByAsc = sortByAsc;
function sortByDesc(items, key) {
    if (key) {
        return items.sort((a, b) => b[key] - a[key]);
    }
    return items.sort((a, b) => b - a);
}
exports.sortByDesc = sortByDesc;
class BitmexOrderBookKeeper extends EventEmitter {
    constructor(options) {
        super();
        this.storedObs = {};
        this.VERIFY_OB_PERCENT = 0;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.enableEvent = options.enableEvent || false;
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const { table, action, data } = res;
            // this logic is similar with transaction_flow/ob_bitmex_fx.ts
            if (table === 'orderBookL2_25') {
                this._saveWsObData(data, action);
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    _saveWsObData(obRows, action) {
        if (obRows.length === 0) {
            console.warn(`empty obRows`);
            return;
        }
        const pair = obRows[0].symbol;
        this.storedObs[pair] = this.storedObs[pair] || {};
        if (_.includes(['partial', 'insert'], action)) {
            // first init, refresh ob data.
            _.each(obRows, row => {
                this.storedObs[pair][String(row.id)] = row;
            });
        }
        else if (action === 'update') {
            // if this order exists, we update it, otherwise don't worry
            _.each(obRows, row => {
                if (this.storedObs[pair][String(row.id)]) {
                    // must update one by one because update doesn't contain price
                    this.storedObs[pair][String(row.id)].size = row.size;
                    this.storedObs[pair][String(row.id)].side = row.side;
                }
                else {
                    console.error(`update ${row.id} does not exist in currentObMap`);
                }
            });
        }
        else if (action === 'delete') {
            _.each(obRows, row => {
                delete this.storedObs[pair][String(row.id)];
            });
        }
        this.lastObWsTime = new Date();
        if (this.enableEvent) {
            this.emit(`orderbook`, this._getCurrentRealTimeOB(pair));
        }
    }
    _getCurrentRealTimeOB(pair) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
        const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
        const bidsUnsorted = _.map(bidsUnsortedRaw, d => ({ r: d.price, a: d.size }));
        const asksUnsorted = _.map(askUnsortedRaw, d => ({ r: d.price, a: d.size }));
        return parsingUtils_1.sortOrderBooks({
            pair,
            ts: this.lastObWsTime,
            bids: bidsUnsorted,
            asks: asksUnsorted,
        });
    }
    // Get WS ob, and fall back to poll. also verify ws ob with poll ob
    getOrderBook(pair, forcePoll) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
                if (!forcePoll)
                    console.warn(`this.lastObWsTime=${this.lastObWsTime} is outdated, polling instead`);
                return yield bitmexRequest_1.pollOrderBook(pair, this.testnet);
            }
            let obPoll;
            const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
            if (verifyWithPoll) {
                obPoll = yield bitmexRequest_1.pollOrderBook(pair, this.testnet);
            }
            const obFromRealtime = this._getCurrentRealTimeOB(pair);
            if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
                if (verifyWithPoll) {
                    parsingUtils_1.verifyObPollVsObWs(obPoll, obFromRealtime);
                }
                return obFromRealtime;
            }
            console.warn(`orderbookws not available, polling instead obWs=${obFromRealtime}`);
            return yield bitmexRequest_1.pollOrderBook(pair, this.testnet);
        });
    }
}
exports.BitmexOrderBookKeeper = BitmexOrderBookKeeper;
