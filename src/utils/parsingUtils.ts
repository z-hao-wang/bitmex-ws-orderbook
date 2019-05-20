import { sortByAsc, sortByDesc } from '../bitmexOrderBookKeeper';

export function isObPriceEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem) {
  if (ob1.r !== ob2.r) return false;
  return true;
}

export function isObAmountEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem) {
  return Math.abs(ob1.a - ob2.a) <= 0.0001;
}

export function isObItemEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem) {
  return isObPriceEqual(ob1, ob2) && isObAmountEqual;
}

export function verifyObPollVsObWs(
  obPoll: Bitmex.OrderBookSchema | undefined | null,
  obWs: Bitmex.OrderBookSchema | null,
): number {
  if (!obPoll) {
    console.error(`obPoll is null`);
    return 0;
  }
  if (!obWs) {
    console.error(`obWs is null`);
    return 0;
  }
  let askPriceDiffPercent = 0;
  if (!isObPriceEqual(obPoll.asks[0], obWs.asks[0])) {
    // logger.warn(`obPoll obWs asks price not equal ${obPoll.asks[0].r} ${obWs.asks[0].r}`);
    askPriceDiffPercent = Math.abs(obPoll.asks[0].r - obWs.asks[0].r) / obWs.asks[0].r;
    if (askPriceDiffPercent > 0.002) {
      console.error(`obPoll obWs asks price diff too much ${obPoll.asks[0].r} ${obWs.asks[0].r}`);
    }
  }

  let bidPriceDiffPercent = 0;
  if (!isObPriceEqual(obPoll.bids[0], obWs.bids[0])) {
    // logger.warn(`obPoll obWs bids price not equal ${obPoll.bids[0].r} ${obWs.bids[0].r}`);
    const bidPriceDiffPercent = Math.abs(obPoll.bids[0].r - obWs.bids[0].r) / obWs.bids[0].r;
    if (bidPriceDiffPercent > 0.01) {
      console.error(`obPoll obWs bids price diff too much ${obPoll.bids[0].r} ${obWs.bids[0].r}`);
    }
  }
  return Math.max(bidPriceDiffPercent, askPriceDiffPercent);
}

export function sortOrderBooks(orderBooks: Bitmex.OrderBookSchema): Bitmex.OrderBookSchema {
  return {
    ...orderBooks,
    bids: sortByDesc(orderBooks.bids, 'r'),
    asks: sortByAsc(orderBooks.asks, 'r'),
  };
}
