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
const parsingUtils_1 = require("./parsingUtils");
const bitmex_request_1 = require("bitmex-request");
function bitmexRequest(method, path, data, retryTimes, testnet) {
    return __awaiter(this, void 0, void 0, function* () {
        const bitmexRequest = new bitmex_request_1.BitmexRequest({
            testnet,
        });
        return bitmexRequest.request(method, path, data, false, retryTimes);
    });
}
exports.bitmexRequest = bitmexRequest;
function getOrderBookHttp(pair, testnet) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = {
            symbol: pair,
            depth: 25,
        };
        const orderBooksRaw = yield bitmexRequest('GET', '/orderBook/L2', data, 1, testnet);
        return orderBooksRaw;
    });
}
// bitmex order book amount is valued with USD amount, convert them to asset amount instead.
function pollOrderBook(pair, testnet) {
    return __awaiter(this, void 0, void 0, function* () {
        const orderBooksRaw = yield getOrderBookHttp(pair, testnet);
        const asks1 = _.filter(orderBooksRaw, (ob) => ob.side === 'Sell');
        const asks2 = _.map(asks1, (ob) => ({ r: ob.price, a: ob.size }));
        const bids1 = _.filter(orderBooksRaw, (ob) => ob.side === 'Buy');
        const bids2 = _.map(bids1, (ob) => ({ r: ob.price, a: ob.size }));
        return parsingUtils_1.sortOrderBooks({ pair, ts: new Date(), bids: bids2, asks: asks2 });
    });
}
exports.pollOrderBook = pollOrderBook;
