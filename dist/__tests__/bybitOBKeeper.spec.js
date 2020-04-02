"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const byBitOrderBookKeeper_1 = require("../byBitOrderBookKeeper");
describe('bitmex ob keeper', () => {
    let keeper;
    const pair = 'USD_BTC_perpetual_swap';
    const obs = [
        {
            type: 'snapshot',
            data: [
                { id: 8700000201, side: 'Sell', size: 3, price: 7002 },
                { id: 8716991251, side: 'Sell', size: 21, price: 7001 },
                { id: 8716991250, side: 'Buy', size: 26, price: 7000.5 },
                { id: 8700000200, side: 'Buy', size: 5, price: 7000 },
            ],
        },
        {
            type: 'delta',
            data: {
                update: [{ id: 8716991250, side: 'Sell', size: 23063 }],
                delete: [{ id: 8700000201 }],
            },
        },
    ];
    beforeEach(() => {
        keeper = new byBitOrderBookKeeper_1.BybitOrderBookKeeper({});
    });
    it(`works with snapshot`, () => {
        keeper.onReceiveOb(obs[0], pair);
        expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    });
    it(`works with update and delete`, () => {
        const keeper = new byBitOrderBookKeeper_1.BybitOrderBookKeeper({});
        keeper.onReceiveOb(obs[0], pair);
        keeper.onReceiveOb(obs[1], pair);
        expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    });
});
