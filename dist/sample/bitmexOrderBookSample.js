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
const index_1 = require("../index");
const websocket_reconnect_1 = require("websocket-reconnect");
(() => {
    const WS_URL_TESTNET = 'wss://testnet.bitmex.com/realtime';
    const WS_URL = 'wss://www.bitmex.com/realtime';
    const bitmexOb = new index_1.BitmexOrderBookKeeper({ testnet: true, enableEvent: true });
    const ws = new websocket_reconnect_1.WsReconnect();
    ws.open(WS_URL_TESTNET);
    ws.on('open', () => {
        ws.send(JSON.stringify({ op: 'subscribe', args: [`orderBookL2_25:XBTUSD`] }));
    });
    ws.on('message', (msg) => bitmexOb.onSocketMessage(msg));
    bitmexOb.on(`orderbook`, ob => {
        console.log(`orderbook from event`, ob);
    });
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        const ob = yield bitmexOb.getOrderBook('XBTUSD');
        console.log(`orderbook from getOrderBook`, ob);
    }), 5000);
})();
