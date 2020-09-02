const BITMEX_ID_TO_PRICE_CONVERSION = {
  ETH: [29700000000, 20],
  BTC: [8800000000, 100],
};

export function idToPrice(symbol: 'BTC' | 'ETH', id: number) {
  const [ID_ZERO, ID_DELTA] = BITMEX_ID_TO_PRICE_CONVERSION[symbol];
  const price = (ID_ZERO - id) / ID_DELTA;
  return +price.toFixed(2);
}
