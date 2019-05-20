import * as request from 'request';
import { requestRetry } from './retry';
import * as _ from 'lodash';
import { sortOrderBooks } from './parsingUtils';
export type Method = 'POST' | 'GET' | 'PUT' | 'DELETE';

const API_VERSION = '/api/v1';
const URL_TESTNET = 'https://testnet.bitmex.com' + API_VERSION;
const URL_PROD = 'https://www.bitmex.com' + API_VERSION;

export function getUrl(testnet: boolean) {
  return testnet ? URL_TESTNET : URL_PROD;
}

export async function bitmexRequest<T = any>(
  method: Method,
  path: string,
  data: any,
  retryTimes: number,
  testnet: boolean,
): Promise<T> {
  const postBody = JSON.stringify(data);
  let headers: any = {
    'content-type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const fullUrl = getUrl(testnet) + path;
  const requestOptions = {
    headers: headers,
    url: fullUrl,
    method,
    body: postBody,
  };
  const requestFunc = async () => {
    return new Promise<T>((resolve, reject) => {
      request(requestOptions, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        if (!body) {
          const errMsg = `empty result, ${method} ${path} ${data}`;
          return reject(errMsg);
        }
        try {
          const parsedBody = JSON.parse(body);
          resolve(parsedBody);
        } catch (e) {
          const errMsg = `parse body json failed, ${method} ${path} ${body}`;
          reject(errMsg);
        }
      });
    });
  };
  return requestRetry(requestFunc, {
    maxRetryTimes: retryTimes,
    successCondition: (res: any) => {
      return res && !res.error;
    },
  });
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
