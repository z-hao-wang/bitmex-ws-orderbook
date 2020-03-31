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
class BybitOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super(options);
        this.storedObs = {};
        this.name = 'bybitObKeeper';
        this.VERIFY_OB_PERCENT = 0.1;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.bybitRequest = new bitmex_request_1.BybitRequest({ testnet: this.testnet });
        this.initLogger();
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const pairMatch = res && res.topic.match(/^orderBookL2_25\.(.*)/);
            const pair = pairMatch && pairMatch[1];
            if (pair) {
                this.storedObs[pair] = this.storedObs[pair] || {};
                this.onReceiveOb(res);
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    onReceiveOb(obs, _pair) {
        // for rebuilding orderbook process.
        if (_pair) {
            this.storedObs[_pair] = this.storedObs[_pair] || {};
        }
        if (_.includes(['snapshot'], obs.type)) {
            // first init, refresh ob data.
            const obRows = obs.data;
            _.each(obRows, row => {
                const pair = _pair || row.symbol;
                this.storedObs[pair][String(row.id)] = row;
            });
        }
        else if (obs.type === 'delta') {
            // if this order exists, we update it, otherwise don't worry
            _.each(obs.data.update, row => {
                const pair = _pair || row.symbol;
                if (this.storedObs[pair][String(row.id)]) {
                    // must update one by one because update doesn't contain price
                    this.storedObs[pair][String(row.id)].size = row.size;
                    this.storedObs[pair][String(row.id)].side = row.side;
                }
            });
            _.each(obs.data.insert, row => {
                const pair = _pair || row.symbol;
                this.storedObs[pair][String(row.id)] = row;
            });
            _.each(obs.data.delete, row => {
                const pair = _pair || row.symbol;
                delete this.storedObs[pair][String(row.id)];
            });
        }
        this.lastObWsTime = new Date();
        if (this.enableEvent) {
            this.emit(`orderbook`, this.getOrderBookWs(obs.topic.match(/orderBookL2_25\.(.*)/)[1]));
        }
    }
    getOrderBookWs(pair, depth = 25) {
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
