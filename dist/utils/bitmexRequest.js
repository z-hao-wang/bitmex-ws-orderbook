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
const request = require("request");
const retry_1 = require("./retry");
const _ = require("lodash");
const parsingUtils_1 = require("./parsingUtils");
const API_VERSION = '/api/v1';
const URL_TESTNET = 'https://testnet.bitmex.com' + API_VERSION;
const URL_PROD = 'https://www.bitmex.com' + API_VERSION;
function getUrl(testnet) {
    return testnet ? URL_TESTNET : URL_PROD;
}
exports.getUrl = getUrl;
function bitmexRequest(method, path, data, retryTimes, testnet) {
    return __awaiter(this, void 0, void 0, function* () {
        const postBody = JSON.stringify(data);
        let headers = {
            'content-type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        const fullUrl = getUrl(testnet) + path;
        const requestOptions = {
            headers: headers,
            url: fullUrl,
            method,
            body: postBody,
        };
        const requestFunc = () => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                request(requestOptions, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (!body) {
                        const errMsg = `empty result, ${method} ${path} ${data}`;
                        return reject(errMsg);
                    }
                    try {
                        const parsedBody = JSON.parse(body);
                        resolve(parsedBody);
                    }
                    catch (e) {
                        const errMsg = `parse body json failed, ${method} ${path} ${body}`;
                        reject(errMsg);
                    }
                });
            });
        });
        return retry_1.requestRetry(requestFunc, {
            maxRetryTimes: retryTimes,
            successCondition: (res) => {
                return res && !res.error;
            },
        });
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
