import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';

export namespace GeneticObKeeper {
  export interface Options {
    enableEvent?: boolean;
  }
}
export class GeneticObKeeper extends BaseKeeper {
  obKeepers: Record<string, GenericObKeeperShared> = {};

  // if initial, return true
  onReceiveOb(params: { pair: string; bids: OrderBookItem[]; asks: OrderBookItem[] }) {
    const { pair, bids, asks } = params;
    if (!this.obKeepers[pair]) {
      this.obKeepers[pair] = new GenericObKeeperShared();
    }
    this.obKeepers[pair].onReceiveOb({ bids, asks });

    if (this.enableEvent) {
      this.emit(`orderbook`, this.getOrderBookWs(pair));
    }
  }

  getOrderBookWs(pair: string) {
    const orderbooks: OrderBookSchema = {
      ts: new Date(),
      pair,
      ...this.obKeepers[pair].getOb(),
    };
    return orderbooks;
  }

  // fallback polling not implmented
  async getOrderBook(pair: string) {
    return this.getOrderBookWs(pair);
  }

  onOrderBookUpdated(callback: (ob: OrderBookSchema) => any) {
    this.on('orderbook', callback);
  }
}
