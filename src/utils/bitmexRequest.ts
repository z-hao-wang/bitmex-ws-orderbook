import * as _ from 'lodash';
import { sortOrderBooks } from './parsingUtils';
import { BitmexRequest } from 'bitmex-request';
import { BitmexOb } from '../types/bitmex.type';
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

async function getOrderBookHttp(pair: string, testnet: boolean): Promise<BitmexOb.BitmexOrderBooks> {
  const data = {
    symbol: pair,
    depth: 25,
  };
  const orderBooksRaw: BitmexOb.BitmexOrderBooks = await bitmexRequest<BitmexOb.BitmexOrderBooks>(
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
  const orderBooksRaw: BitmexOb.BitmexOrderBooks = await getOrderBookHttp(pair, testnet);
  const asks1: BitmexOb.BitmexOrderBookItem[] = _.filter(
    orderBooksRaw,
    (ob: BitmexOb.BitmexOrderBookItem) => ob.side === 'Sell',
  );
  const asks2: BitmexOb.OrderBookItem[] = _.map(
    asks1,
    (ob: BitmexOb.BitmexOrderBookItem) => ({ r: ob.price, a: ob.size } as BitmexOb.OrderBookItem),
  );

  const bids1: BitmexOb.BitmexOrderBookItem[] = _.filter(
    orderBooksRaw,
    (ob: BitmexOb.BitmexOrderBookItem) => ob.side === 'Buy',
  );
  const bids2: BitmexOb.OrderBookItem[] = _.map(
    bids1,
    (ob: BitmexOb.BitmexOrderBookItem) => ({ r: ob.price, a: ob.size } as BitmexOb.OrderBookItem),
  );
  return sortOrderBooks({ pair, ts: new Date(), bids: bids2, asks: asks2 });
}
