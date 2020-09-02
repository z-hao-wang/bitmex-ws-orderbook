"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BITMEX_ID_TO_PRICE_CONVERSION = {
    ETH: [29700000000, 20],
    BTC: [8800000000, 100],
};
function idToPrice(symbol, id) {
    const [ID_ZERO, ID_DELTA] = BITMEX_ID_TO_PRICE_CONVERSION[symbol];
    const price = (ID_ZERO - id) / ID_DELTA;
    return +price.toFixed(2);
}
exports.idToPrice = idToPrice;
