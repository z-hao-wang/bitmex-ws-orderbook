import { OrderBookItem, OrderBookSchema } from 'bitmex-request';

export function isObPriceEqual(ob1: OrderBookItem, ob2: OrderBookItem) {
  if (ob1.r !== ob2.r) return false;
  return true;
}

export function isObAmountEqual(ob1: OrderBookItem, ob2: OrderBookItem) {
  return Math.abs(ob1.a - ob2.a) <= 0.0001;
}

export function isObItemEqual(ob1: OrderBookItem, ob2: OrderBookItem) {
  return isObPriceEqual(ob1, ob2) && isObAmountEqual;
}

export function verifyObPollVsObWs(obPoll: OrderBookSchema | undefined | null, obWs: OrderBookSchema | null): number {
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

export function sortOrderBooks(orderBooks: OrderBookSchema): OrderBookSchema {
  return {
    ...orderBooks,
    bids: sortByDesc(orderBooks.bids, 'r'),
    asks: sortByAsc(orderBooks.asks, 'r'),
  };
}

export function sortByAsc(items: any[], key?: string) {
  if (key) {
    return items.sort((a, b) => a[key] - b[key]);
  }
  return items.sort((a, b) => a - b);
}

export function sortByDesc(items: any[], key?: string) {
  if (key) {
    return items.sort((a, b) => b[key] - a[key]);
  }
  return items.sort((a, b) => b - a);
}
