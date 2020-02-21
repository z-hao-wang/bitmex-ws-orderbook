import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
import * as _ from 'lodash';

/*
{
  "e": "depthUpdate", // Event type
  "E": 123456789,     // Event time
  "T": 123456788,     // transaction time
  "s": "BTCUSDT",      // Symbol
  "U": 157,           // first update Id from last stream
  "u": 160,           // last update Id from last stream
  "pu": 149,          // last update Id in last stream（ie ‘u’ in last stream）
  "b": [              // Bids to be updated
    [
      "0.0024",       // Price level to be updated
      "10"            // Quantity
    ]
  ],
  "a": [              // Asks to be updated
    [
      "0.0026",       // Price level to be updated
      "100"          // Quantity
    ]
  ]
}
 */

export interface ObStream {
  e: string;
  E: number;
  T: number;
  s: string;
  U: number;
  u: number;
  pu: number;
  b: string[][];
  a: string[][];
}
const autoParseFloat = (v: string | number): number => (_.isString(v) ? parseFloat(v) : v);
export function binanceObToStandardOb(v: (number | string)[]): OrderBookItem {
  return { r: autoParseFloat(v[0]), a: autoParseFloat(v[1]) };
}

export class BinanceFxObKeeper extends GenericObKeeper {
  onSocketMessage(msg: any) {
    try {
      const res: { stream: string; data: ObStream } = _.isString(msg) ? JSON.parse(msg) : msg;
      const { data } = res;
      if (data.e === 'depthUpdate') {
        this.onReceiveOb({
          pair: data.s.toLowerCase(),
          bids: _.map(data.b, binanceObToStandardOb),
          asks: _.map(data.a, binanceObToStandardOb),
        });
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }
}
