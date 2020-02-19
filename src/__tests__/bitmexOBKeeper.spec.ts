import { BitmexOrderBookKeeper } from '../bitmexOrderBookKeeper';

describe('bitmex ob keeper', () => {
  const pair = 'USD_BTC_perpetual_swap';
  const obs = [
    {
      action: 'partial',
      data: [
        { id: 8700000201, side: 'Sell', size: 3, price: 7002 },
        { id: 8716991251, side: 'Sell', size: 21, price: 7001 },
        { id: 8716991250, side: 'Buy', size: 26, price: 7000.5 },
        { id: 8700000200, side: 'Buy', size: 5, price: 7000 },
      ],
    },
    {
      action: 'update',
      data: [{ id: 8716991250, side: 'Sell', size: 23063 }],
    },
    {
      action: 'delete',
      data: [{ id: 8700000201 }],
    },
  ];

  it(`works with partial`, () => {
    const keeper = new BitmexOrderBookKeeper({});
    keeper.onReceiveOb(obs[0].data as any, obs[0].action, pair);
    expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    keeper.onReceiveOb(obs[1].data as any, obs[1].action, pair);
  });

  it(`works with update`, () => {
    const keeper = new BitmexOrderBookKeeper({});
    keeper.onReceiveOb(obs[0].data as any, obs[0].action, pair);
    keeper.onReceiveOb(obs[1].data as any, obs[1].action, pair);
    expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
  });

  it(`works with delete`, () => {
    const keeper = new BitmexOrderBookKeeper({});
    keeper.onReceiveOb(obs[0].data as any, obs[0].action, pair);
    keeper.onReceiveOb(obs[2].data as any, obs[2].action, pair);
    expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
  });
});
