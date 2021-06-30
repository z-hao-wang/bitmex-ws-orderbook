import { OrderBookItem } from 'bitmex-request/dist/sharedTypes';
import { GenericObKeeper } from './genericObKeeper';
import * as _ from 'lodash';

export namespace PhemexObKeeper {
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
}

export function phemexToStandardOb(v: number[]): OrderBookItem {
  return { r: v[0] / 10000, a: v[1] };
}

export class PhemexObKeeper extends GenericObKeeper {
  onSocketMessage(msg: any) {
    try {
      const res: PhemexObKeeper.ObWsData = _.isString(msg) ? JSON.parse(msg) : msg;
      const { book, symbol, type } = res;
      if (book) {
        this.onReceiveObRaw({
          pair: symbol,
          book,
          type,
        });
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  onReceiveObRaw(params: { pair: string; book: PhemexObKeeper.ObRes; type: 'incremental' | 'snapshot' }) {
    this.onReceiveOb({
      pair: params.pair,
      bids: _.map(params.book.bids, phemexToStandardOb),
      asks: _.map(params.book.asks, phemexToStandardOb),
      isNewSnapshot: params.type === 'snapshot',
    });
  }
}
