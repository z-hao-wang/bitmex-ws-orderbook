import { BitfinexObKeeper } from '../bitfinexObKeeper';
import * as _ from 'lodash';

describe('bitfinex ob keeper', () => {
  const pair = 'USD_BTC';
  const obInitial = [
    [152.46, 2, 40.50152043],
    [152.35, 1, 0.68514292],
    [152.34, 2, 11.3],
    [152.32, 2, 13],
    [152.48, 6, -8.18084404],
    [152.49, 1, -14.31512963],
    [152.5, 2, -25.52159388],
    [152.51, 2, -6],
    [152.53, 1, -70],
  ];
  it(`works with replacing`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(_.isEqual(keeper.obCache[pair], obInitial)).toBeTruthy();
    keeper.onReceiveOb(pair, [152.51, 2, -12]);
    expect(keeper.obCache[pair][7]).toEqual([152.51, 2, -12]);
  });

  it(`works with inserting ask`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [152.52, 2, -12]);
    expect(keeper.obCache[pair][8]).toEqual([152.52, 2, -12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with inserting ask at last`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [154.52, 2, -12]);
    expect(keeper.obCache[pair][9]).toEqual([154.52, 2, -12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with inserting ask at top`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [152.47, 2, -12]);
    expect(keeper.obCache[pair][4]).toEqual([152.47, 2, -12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with inserting bid`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [152.33, 2, 12]);
    expect(keeper.obCache[pair][3]).toEqual([152.33, 2, 12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with inserting bid at last`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [151.52, 1, 12]);
    expect(keeper.obCache[pair][4]).toEqual([151.52, 1, 12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with inserting bid at top`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [152.47, 1, 12]);
    expect(keeper.obCache[pair][0]).toEqual([152.47, 1, 12]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length + 1);
  });

  it(`works with deleting bid`, () => {
    const keeper = new BitfinexObKeeper({});
    keeper.onReceiveOb(pair, obInitial);
    expect(keeper.obCache[pair].length).toBe(obInitial.length);
    keeper.onReceiveOb(pair, [152.34, 0, 21]);
    expect(keeper.obCache[pair][2]).toEqual([152.32, 2, 13]);
    expect(keeper.obCache[pair].length).toBe(obInitial.length - 1);
  });
});
