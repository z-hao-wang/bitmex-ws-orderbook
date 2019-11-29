import * as _ from 'lodash';
import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
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
  obCache: Record<string, { bids: number[][]; asks: number[][] }> = {};

  onSocketMessage(msg: any) {
    try {
      const res: GdaxObKeeper.OrderBookRealtime = _.isString(msg) ? JSON.parse(msg) : msg;
      const { type, product_id: pair } = res;
      // this logic is similar with transaction_flow/ob_bitmex_fx.ts
      if (type === 'snapshot') {
        this.obCache[pair] = {
          bids: _.map((res as GdaxObKeeper.OrderBookRealtimeSnap).bids, b => this.convertToNum(b)),
          asks: _.map((res as GdaxObKeeper.OrderBookRealtimeSnap).asks, b => this.convertToNum(b)),
        };
      } else if (type === 'l2update') {
        this.performObUpdate(res as GdaxObKeeper.OrderBookRealtimeChange);
      } else {
        this.logger.error(`unknown type ${type}`);
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  convertToNum(items: string[]) {
    return _.map(items, b => parseFloat(b));
  }

  performObUpdate(data: GdaxObKeeper.OrderBookRealtimeChange) {
    const pair = data.product_id;
    if (!this.obCache[pair]) {
      throw new Error(`gdax ob keeper invalid pair ${pair}, no existing data`);
    }
    const { changes } = data;
    _.each(changes, change => {
      const side = change[0];
      const price = parseFloat(change[1]);
      const amount = parseFloat(change[2]);

      if (side === 'buy') {
        const obs = this.obCache[pair].bids;
        let foundMatch = false;
        for (let i = 0; i < obs.length; i++) {
          if (obs[i][0] === price) {
            if (amount > 0) {
              // replace
              obs[i][1] = amount;
            } else {
              //delete
              obs.splice(i, 1);
            }
            foundMatch = true;
            break;
          } else if (amount > 0 && obs[i][0] < price) {
            // price ordered from high to low (decending), when we met a price that is higher, must insert into book at this location
            obs.splice(i, 0, [price, amount]);
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          // this means we need to insert item at bottom
          obs.push([price, amount]);
        }
      } else if (side === 'sell') {
        const obs = this.obCache[pair].asks;
        let foundMatch = false;
        for (let i = 0; i < obs.length; i++) {
          if (obs[i][0] === price) {
            if (amount > 0) {
              // replace
              obs[i][1] = amount;
            } else {
              //delete
              obs.splice(i, 1);
            }
            foundMatch = true;
            break;
          } else if (amount > 0 && obs[i][0] > price) {
            // price ordered from low to high (ascending), when we met a price that is lower, must insert into book at this location
            obs.splice(i, 0, [price, amount]);
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          // insert at bottom of book
          obs.push([price, amount]);
        }
      }
    });
  }

  formatOrderBookItem(orderBookItem: number[]): OrderBookItem {
    return {
      r: orderBookItem[0],
      a: orderBookItem[2],
    };
  }

  getOrderBookWs(pair: string) {
    const orderbooks: OrderBookSchema = {
      ts: new Date(),
      pair,
      bids: this.obCache[pair].bids.map(this.formatOrderBookItem),
      asks: this.obCache[pair].asks.map(this.formatOrderBookItem),
    };
    if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
      console.error(`invalid bids or asks this.obCache[pair] ${pair}`, this.obCache[pair]);
    }
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
