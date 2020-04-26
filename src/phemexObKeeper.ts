import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
import * as _ from 'lodash';

export interface ObRes {
  bids: number[][];
  asks: number[][];
}

export interface ObWsData {
  book: ObRes;
  depth: number; // 30
  sequence: number;
  symbol: string;
  timestamp: number; // nano seconds
  type: 'incremental' | 'snapshot';
}

export function phemexToStandardOb(v: number[]): OrderBookItem {
  return { r: v[0] / 10000, a: v[1] };
}

export class PhemexObKeeper extends GenericObKeeper {
  onSocketMessage(msg: any) {
    try {
      const res: ObWsData = _.isString(msg) ? JSON.parse(msg) : msg;
      const { book, symbol } = res;
      if (book) {
        this.onReceiveOb({
          pair: symbol,
          bids: _.map(book.bids, phemexToStandardOb),
          asks: _.map(book.asks, phemexToStandardOb),
        });
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }
}
