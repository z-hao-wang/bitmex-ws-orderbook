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
const bitmex_request_1 = require("bitmex-request");
const traderUtils = require("./utils/traderUtils");
const parsingUtils_1 = require("./utils/parsingUtils");
const EventEmitter = require("events");
const moment = require("moment");
class BybitOrderBookKeeper extends EventEmitter {
    constructor(options) {
        super();
        this.storedObs = {};
        this.VERIFY_OB_PERCENT = 0;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.enableEvent = options.enableEvent || false;
        this.bybitRequest = new bitmex_request_1.BybitRequest({ testnet: this.testnet });
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const pairMatch = res.topic.match(/^orderBookL2_25\.(.*)/);
            const pair = pairMatch && pairMatch[1];
            if (pair) {
                this.storedObs[pair] = this.storedObs[pair] || {};
                this._saveWsObData(res);
            }
        }
        catch (e) {
            console.error(moment().format('YYYY-MM-DD HH:mm:ss'), e);
        }
    }
    _saveWsObData(obs) {
        if (_.includes(['snapshot'], obs.type)) {
            // first init, refresh ob data.
            const obRows = obs.data;
            _.each(obRows, row => {
                this.storedObs[row.symbol][String(row.id)] = row;
            });
        }
        else if (obs.type === 'delta') {
            // if this order exists, we update it, otherwise don't worry
            _.each(obs.data.update, row => {
                if (this.storedObs[row.symbol][String(row.id)]) {
                    // must update one by one because update doesn't contain price
                    this.storedObs[row.symbol][String(row.id)].size = row.size;
                    this.storedObs[row.symbol][String(row.id)].side = row.side;
                }
            });
            _.each(obs.data.insert, row => {
                this.storedObs[row.symbol][String(row.id)] = row;
            });
            _.each(obs.data.delete, row => {
                delete this.storedObs[row.symbol][String(row.id)];
            });
        }
        this.lastObWsTime = new Date();
        if (this.enableEvent) {
            this.emit(`orderbook`, this._getCurrentRealTimeOB(obs.topic.match(/orderBookL2_25\.(.*)/)[1]));
        }
    }
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
    }
    _getCurrentRealTimeOB(pair) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
        const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
        const bidsUnsorted = _.map(bidsUnsortedRaw, d => ({ r: +d.price, a: d.size }));
        const asksUnsorted = _.map(askUnsortedRaw, d => ({ r: +d.price, a: d.size }));
        return parsingUtils_1.sortOrderBooks({
            pair,
            ts: this.lastObWsTime,
            bids: bidsUnsorted,
            asks: asksUnsorted,
        });
    }
    // Get WS ob, and fall back to poll. also verify ws ob with poll ob
    getOrderBook(pairEx, forcePoll) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
                if (!forcePoll)
                    console.warn(moment().format('YYYY-MM-DD HH:mm:ss') +
                        ` this.lastObWsTime=${this.lastObWsTime && this.lastObWsTime.toISOString()} is outdated diff=(${Date.now() - (this.lastObWsTime ? this.lastObWsTime.getTime() : 0)}), polling instead`);
                return yield this.bybitRequest.pollOrderBook(pairEx);
            }
            let obPoll;
            const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
            if (verifyWithPoll) {
                obPoll = yield this.bybitRequest.pollOrderBook(pairEx);
            }
            const obFromRealtime = this._getCurrentRealTimeOB(pairEx);
            if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
                if (verifyWithPoll) {
                    parsingUtils_1.verifyObPollVsObWs(obPoll, obFromRealtime);
                }
                return obFromRealtime;
            }
            console.warn(moment().format('YYYY-MM-DD HH:mm:ss') + ` orderbookws not available, polling instead obWs=${obFromRealtime}`);
            if (obPoll) {
                return obPoll;
            }
            return yield this.bybitRequest.pollOrderBook(pairEx);
        });
    }
}
exports.BybitOrderBookKeeper = BybitOrderBookKeeper;
