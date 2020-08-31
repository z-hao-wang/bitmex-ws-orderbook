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
  onSocketMessage(msg: any, pairDb?: string) {
    try {
      const data: ObStream = _.isString(msg) ? JSON.parse(msg) : msg;
      if (data.e === 'depthUpdate') {
        // some delete are always in bid, but should be in ask instead
        const bids = _.map(data.b, binanceObToStandardOb);
        const asks = _.map(data.a, binanceObToStandardOb);
        const pair = pairDb || data.s.toUpperCase();
        const currentOb = this.getOrderBookWs(pair);
        for (let bid of bids) {
          if (currentOb.asks[0] && bid.a === 0 && bid.r >= currentOb.asks[0].r) {
            asks.push(bid);
            // console.log(`BinanceFxObKeeper moving bid ${JSON.stringify(bid)} to ask topAsk=${currentOb.asks[0].r}`);
          }
        }

        for (let ask of asks) {
          if (currentOb.bids[0] && ask.a === 0 && ask.r <= currentOb.bids[0].r) {
            bids.push(ask);
            // console.log(`BinanceFxObKeeper moving ask ${JSON.stringify(ask)} to bid topBid=${currentOb.bids[0].r}`);
          }
        }
        this.onReceiveOb({
          pair,
          bids,
          asks,
        });
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }
}
