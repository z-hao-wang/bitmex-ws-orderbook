import * as _ from 'lodash';
import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';
/**
 {
    "type": "snapshot",
    "product_id": "BTC-USD",
    "bids": [["10101.10", "0.45054140"]],
    "asks": [["10102.55", "0.57753524"]]
}
 {
  "type": "l2update",
  "product_id": "BTC-USD",
  "time": "2019-08-14T20:42:27.265Z",
  "changes": [
    [
      "buy",
      "10101.80000000",
      "0.162567"
    ]
  ]
}
 */
/**
 Subsequent updates will have the type l2update. The changes property of l2updates is an array with [side, price, size] tuples. The time property of l2update is the time of the event as recorded by our trading engine. Please note that size is the updated size at that price level, not a delta. A size of "0" indicates the price level can be removed.
 */

export namespace GdaxObKeeper {
  export interface OrderBookRealtimeSnap {
    type: 'snapshot';
    product_id: string;
    bids: string[][];
    asks: string[][];
  }

  export interface OrderBookRealtimeChange {
    type: 'l2update';
    product_id: string;
    time: Date;
    changes: string[][];
  }
  export type OrderBookRealtime = OrderBookRealtimeSnap | OrderBookRealtimeChange;
}

export class GdaxObKeeper extends BaseKeeper {
  obKeepers: Record<string, GenericObKeeperShared> = {};

  onSocketMessage(msg: any) {
    try {
      const res: GdaxObKeeper.OrderBookRealtime = _.isString(msg) ? JSON.parse(msg) : msg;
      const { type, product_id: pair } = res;
      // this logic is similar with transaction_flow/ob_bitmex_fx.ts
      if (type === 'snapshot') {
        this.onReceiveOb({
          pair,
          bids: _.map((res as GdaxObKeeper.OrderBookRealtimeSnap).bids, b => this.convertToObSchema(b)),
          asks: _.map((res as GdaxObKeeper.OrderBookRealtimeSnap).asks, b => this.convertToObSchema(b)),
        });
      } else if (type === 'l2update') {
        this.performObUpdate(res as GdaxObKeeper.OrderBookRealtimeChange);
      } else {
        this.logger.error(`unknown type ${type}`);
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  onReceiveOb(params: { pair: string; bids: OrderBookItem[]; asks: OrderBookItem[]; isNewSnapshot?: boolean }) {
    const { pair, bids, asks, isNewSnapshot } = params;
    if (!this.obKeepers[pair]) {
      this.obKeepers[pair] = new GenericObKeeperShared();
    }
    if (isNewSnapshot) {
      this.obKeepers[pair].init();
    }
    this.obKeepers[pair].onReceiveOb({ bids, asks });

    if (this.enableEvent) {
      this.emit(`orderbook`, this.getOrderBookWs(pair));
    }
  }

  convertToObSchema(item: string[]): OrderBookItem {
    return {
      r: parseFloat(item[0]),
      a: parseFloat(item[1]),
    };
  }

  performObUpdate(data: GdaxObKeeper.OrderBookRealtimeChange) {
    const pair = data.product_id;
    const { changes } = data;
    _.each(changes, change => {
      const side = change[0];
      const price = parseFloat(change[1]);
      const amount = parseFloat(change[2]);
      const bids = side === 'buy' ? [{ r: price, a: amount }] : [];
      const asks = side === 'sell' ? [{ r: price, a: amount }] : [];
      this.obKeepers[pair].onReceiveOb({ bids, asks });
    });
  }

  formatOrderBookItem(orderBookItem: number[]): OrderBookItem {
    return {
      r: orderBookItem[0],
      a: orderBookItem[1],
    };
  }

  getOrderBookWs(pair: string, depth = 25) {
    const orderbooks: OrderBookSchema = {
      ...this.obKeepers[pair].getOb(depth),
      ts: new Date(),
      pair,
    };
    if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
      this.logger.error(`coinbase invalid bids or asks this.obCache[pair] ${pair}`);
    }
    this.lastObWsTime = new Date();
    return orderbooks;
  }

  // fallback polling not implemented
  async getOrderBook(pair: string) {
    return this.getOrderBookWs(pair);
  }

  onOrderBookUpdated(callback: (ob: OrderBookSchema) => any) {
    this.on('orderbook', callback);
  }
}
