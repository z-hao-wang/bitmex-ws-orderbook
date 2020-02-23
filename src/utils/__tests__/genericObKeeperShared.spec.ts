import { GenericObKeeperShared } from '../genericObKeeperShared';

describe('GenericObKeeperShared', () => {
  const pair = 'USD_BTC_perpetual_swap';
  const obs = [
    {
      bids: [{ a: 3, r: 7002 }, { a: 21, r: 7001 }, { a: 26, r: 7000.5 }, { a: 5, r: 7000 }],
      asks: [{ a: 3, r: 7002.5 }, { a: 21, r: 7009 }, { a: 26, r: 7010.5 }, { a: 5, r: 7011 }],
    },
  ];

  it(`works with new`, () => {
    const keeper = new GenericObKeeperShared();
    keeper.onReceiveOb(obs[0]);
    expect(keeper.getOb(4)).toMatchSnapshot();
  });

  it(`works with reversed`, () => {
    const keeper = new GenericObKeeperShared();
    keeper.onReceiveOb({
      bids: [{ a: 3, r: 7002 }, { a: 21, r: 7001 }, { a: 26, r: 7000.5 }, { a: 5, r: 7000 }].reverse(),
      asks: [{ a: 3, r: 7002.5 }, { a: 21, r: 7009 }, { a: 26, r: 7010.5 }, { a: 5, r: 7011 }].reverse(),
    });
    expect(keeper.getOb(4)).toMatchSnapshot();
  });
});
