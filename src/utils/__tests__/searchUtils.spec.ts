import * as searchUtils from '../searchUtils';

describe('searchUtils', () => {
  const ob = {
    bids: [{ a: 3, r: 7002 }, { a: 21, r: 7001 }, { a: 26, r: 7000.5 }, { a: 5, r: 7000 }],
    asks: [{ a: 3, r: 7002.5 }, { a: 21, r: 7009 }, { a: 26, r: 7010.5 }, { a: 5, r: 7011 }],
  };

  it(`sortedFindFirstGreater`, () => {
    expect(searchUtils.sortedFindFirstGreater(ob.asks, 7010, ob => ob.r)).toBe(2);
    expect(searchUtils.sortedFindFirstGreater(ob.asks, 7009, ob => ob.r)).toBe(2);
    expect(searchUtils.sortedFindFirstGreater(ob.asks, 7020, ob => ob.r)).toBe(-1);

    let err = false;
    try {
      searchUtils.sortedFindFirstGreater(ob.bids, 7000, ob => ob.r);
    } catch (e) {
      err = true;
    }
    expect(err).toBeTruthy();
  });

  it(`sortedFindFirstGreaterEqual found equal index`, () => {
    expect(searchUtils.sortedFindFirstGreaterEqual(ob.asks, 7009, ob => ob.r)).toBe(1);
  });

  it(`sortedFindFirstGreaterEqual last index`, () => {
    expect(
      searchUtils.sortedFindFirstGreaterEqual(
        [
          { r: 152.48, a: 8.18084404 },
          { r: 152.49, a: 14.31512963 },
          { r: 152.5, a: 25.52159388 },
          { r: 152.51, a: 6 },
          { r: 152.53, a: 70 },
        ],
        152.52,
        ob => ob.r,
      ),
    ).toBe(4);
  });

  it(`sortedFindFirstSmaller`, () => {
    expect(searchUtils.sortedFindFirstSmaller(ob.bids, 7001.5, ob => ob.r)).toBe(1);
    expect(searchUtils.sortedFindFirstSmaller(ob.bids, 7001, ob => ob.r)).toBe(2);
    expect(searchUtils.sortedFindFirstSmaller(ob.bids, 6555, ob => ob.r)).toBe(-1);

    let err = false;
    try {
      searchUtils.sortedFindFirstSmaller(ob.asks, 7000, ob => ob.r);
    } catch (e) {
      err = true;
    }
    expect(err).toBeTruthy();
  });

  it(`sortedFindFirstSmallerEqual found equal index`, () => {
    expect(searchUtils.sortedFindFirstSmallerEqual(ob.bids, 7001, ob => ob.r)).toBe(1);
  });

  it(`sortedFindFirstSmallerEqual last index`, () => {
    expect(
      searchUtils.sortedFindFirstSmallerEqual(
        [
          { r: 152.5, a: 8.18084404 },
          { r: 152.4, a: 14.31512963 },
          { r: 152.3, a: 25.52159388 },
          { r: 152.2, a: 6 },
          { r: 152.15, a: 70 },
        ],
        152.18,
        ob => ob.r,
      ),
    ).toBe(4);
  });
});
