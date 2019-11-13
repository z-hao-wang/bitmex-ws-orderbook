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
const baseKeeper_1 = require("./baseKeeper");
class BitmexOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super();
        this.storedObs = {};
        this.VERIFY_OB_PERCENT = 0;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.enableEvent = options.enableEvent || false;
        this.bitmexRequest = new bitmex_request_1.BitmexRequest({ testnet: this.testnet });
        this.name = 'bybitObKeeper';
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
            this.logger.error('onSocketMessage', e);
        }
    }
    _saveWsObData(obRows, action) {
        if (obRows.length === 0) {
            this.logger.warn(`_saveWsObData empty obRows`);
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
                    const errMsg = `${this.name} update ${row.id} does not exist in currentObMap`;
                    this.logger.error(errMsg);
                    this.emit(`error`, errMsg);
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
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
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
            const obFromRealtime = this._getCurrentRealTimeOB(pairEx);
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
