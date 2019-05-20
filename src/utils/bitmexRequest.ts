import * as _ from 'lodash';
import { sortOrderBooks } from './parsingUtils';
import { BitmexRequest } from 'bitmex-request';
export type Method = 'POST' | 'GET' | 'PUT' | 'DELETE';

export async function bitmexRequest<T = any>(
  method: Method,
  path: string,
  data: any,
  retryTimes: number,
  testnet: boolean,
): Promise<T> {
  const bitmexRequest = new BitmexRequest({
    testnet,
  });
  return bitmexRequest.request(method, path, data, false, retryTimes);
}

async function getOrderBookHttp(pair: string, testnet: boolean): Promise<Bitmex.BitmexOrderBooks> {
  const data = {
    symbol: pair,
    depth: 25,
  };
  const orderBooksRaw: Bitmex.BitmexOrderBooks = await bitmexRequest<Bitmex.BitmexOrderBooks>(
    'GET',
    '/orderBook/L2',
    data,
    1,
    testnet,
  );
  return orderBooksRaw;
}

// bitmex order book amount is valued with USD amount, convert them to asset amount instead.
export async function pollOrderBook(pair: string, testnet: boolean) {
  const orderBooksRaw: Bitmex.BitmexOrderBooks = await getOrderBookHttp(pair, testnet);
  const asks1: Bitmex.BitmexOrderBookItem[] = _.filter(
    orderBooksRaw,
    (ob: Bitmex.BitmexOrderBookItem) => ob.side === 'Sell',
  );
  const asks2: Bitmex.OrderBookItem[] = _.map(
    asks1,
    (ob: Bitmex.BitmexOrderBookItem) => ({ r: ob.price, a: ob.size } as Bitmex.OrderBookItem),
  );

  const bids1: Bitmex.BitmexOrderBookItem[] = _.filter(
    orderBooksRaw,
    (ob: Bitmex.BitmexOrderBookItem) => ob.side === 'Buy',
  );
  const bids2: Bitmex.OrderBookItem[] = _.map(
    bids1,
    (ob: Bitmex.BitmexOrderBookItem) => ({ r: ob.price, a: ob.size } as Bitmex.OrderBookItem),
  );
  return sortOrderBooks({ pair, ts: new Date(), bids: bids2, asks: asks2 });
}
