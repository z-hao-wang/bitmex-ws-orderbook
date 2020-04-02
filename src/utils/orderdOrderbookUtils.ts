import { InternalOb } from '../types/shared.type';
import { OrderBookItem } from 'bitmex-request';
import * as _ from 'lodash';

export function findBestBid(splitIndex: number, storedObsOrdered: InternalOb[]) {
  let i = splitIndex;
  if (!storedObsOrdered[i]) {
    throw new Error(`findBestBid invalid splitIndex=${i}`);
  }
  if (storedObsOrdered[i].a === 0) {
    // is this deleted item, start from top
    i = 0;
  }

  const sideSplit = storedObsOrdered[i].s;
  if (sideSplit === 0) {
    // go down until we see Sell
    while (i < storedObsOrdered.length && (storedObsOrdered[i].s === 0 || storedObsOrdered[i].a === 0)) {
      i++;
    }
    return { i: i - 1, bid: storedObsOrdered[i - 1] };
  } else {
    // go up until we see first buy
    while (i > 0 && (storedObsOrdered[i].s === 1 || storedObsOrdered[i].a === 0)) {
      i--;
    }
    return { i: i, bid: storedObsOrdered[i] };
  }
}

export function findBestAsk(splitIndex: number, storedObsOrdered: InternalOb[]) {
  let i = splitIndex;

  if (!storedObsOrdered[i]) {
    throw new Error(`findBestAsk invalid splitIndex=${i}`);
  }
  if (storedObsOrdered[i].a === 0) {
    // is this deleted item, start from bottom
    i = storedObsOrdered.length - 1;
  }

  const sideSplit = storedObsOrdered[i].s;
  if (sideSplit === 0 || storedObsOrdered[i].a === 0) {
    // go down until we see Sell
    while (i < storedObsOrdered.length && (storedObsOrdered[i].s === 0 || storedObsOrdered[i].a === 0)) {
      i++;
    }
    return { i: i, ask: storedObsOrdered[i] };
  } else {
    // go up until we see first buy
    while (i >= 0 && (storedObsOrdered[i].s === 1 || storedObsOrdered[i].a === 0)) {
      i--;
    }
    return { i: i + 1, ask: storedObsOrdered[i + 1] };
  }
}

export function buildFromOrderedOb(params: {
  bidI: number;
  askI: number;
  storedObsOrdered: InternalOb[];
  depth: number;
}) {
  const { bidI, askI, storedObsOrdered, depth } = params;
  const asks: OrderBookItem[] = [];
  const bids: OrderBookItem[] = [];
  for (let i = bidI; i >= 0 && bids.length < depth; i--) {
    const item = storedObsOrdered[i];
    if (item.a > 0) {
      bids.push({
        r: item.r,
        a: item.a,
      });
    }
  }
  for (let i = askI; i < storedObsOrdered.length && asks.length < depth; i++) {
    const item = storedObsOrdered[i];
    if (item.a > 0) {
      asks.push({
        r: item.r,
        a: item.a,
      });
    }
  }
  return { bids, asks };
}

export function reverseBuildIndex(storedObsOrdered: InternalOb[], storedObs: Record<string, InternalOb>) {
  _.each(storedObsOrdered, (o, i) => {
    // undefined is allowed due to it can be deleted
    if (storedObs[String(o.id)]) {
      storedObs[String(o.id)].idx = i;
    }
  });
}
