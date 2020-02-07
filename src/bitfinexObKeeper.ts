import * as _ from 'lodash';
import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
/**
 * [ 11153,
 [ [ 152.47, 2, 40.50152043 ],
 [ 152.35, 1, 0.68514292 ],
 [ 152.34, 2, 11.3 ],
 [ 152.32, 2, 13 ],
 [ 152.48, 6, -8.18084404 ],
 [ 152.49, 1, -14.31512963 ],
 [ 152.5, 2, -25.52159388 ],
 [ 152.51, 2, -6 ],
 [ 152.53, 1, -70 ],
 */
/**
 * when count > 0 then you have to add or update the price level
 3.1 if amount > 0 then add/update bids
 3.2 if amount < 0 then add/update asks
 when count = 0 then you have to delete the price level.
 4.1 if amount = 1 then remove from bids
 4.2 if amount = -1 then remove from asks
 */
export namespace BitfinexObKeeper {
  export interface Options {
    enableEvent?: boolean;
  }
}
export class BitfinexObKeeper extends BaseKeeper {
  obCache: Record<string, number[][]> = {};

  // if initial, return true
  onReceiveOb(pair: string, _data: number[][] | number[]): boolean {
    if (!this.obCache[pair]) {
      this.obCache[pair] = _data.slice(0) as number[][];
      return true;
    } else {
      // update ob in matching price
      const cache = this.obCache[pair];
      // this is not very efficient, but it can get things done
      const data = _data as number[];
      const price = data[0];
      const count = data[1];
      const amount = data[2];
      if (amount > 0) {
        // search from top.
        for (let i = 0; i < cache.length; i++) {
          if (cache[i][2] < 0) {
            // searched all list, but non found, means this price must be lower than all of the bids, insert at last
            cache.splice(i, 0, data);
            break;
          }
          if (cache[i][0] === price) {
            if (count > 0) {
              cache[i][1] = data[1];
              cache[i][2] = data[2];
            } else if (count === 0) {
              cache.splice(i, 1);
            }
            break;
          } else if (count > 0 && cache[i][0] < price) {
            // price ordered from high to low, when we met a price that is lower, must insert into book
            cache.splice(i, 0, data);
            break;
          }
        }
      } else {
        for (let i = cache.length - 1; i >= 0; i--) {
          if (cache[i][2] > 0) {
            cache.splice(i + 1, 0, data);
            break;
          }
          if (cache[i][0] === price) {
            if (count > 0) {
              cache[i][1] = data[1];
              cache[i][2] = data[2];
            } else if (count === 0) {
              cache.splice(i, 1);
            }
            break;
          } else if (cache[i][0] < price && count > 0) {
            // price ordered from high to low in reversed order, when we met a price that is lower, must insert into book
            if (i === cache.length - 1) {
              cache.push(data);
            } else {
              cache.splice(i + 1, 0, data);
            }
            break;
          }
        }
      }
      if (this.enableEvent) {
        this.emit(`orderbook`, this.getOrderBookWs(pair));
      }
      return false;
    }
  }

  formatOrderBookItem(orderBookItem: number[]): OrderBookItem {
    return {
      r: orderBookItem[0],
      a: Math.abs(orderBookItem[2]),
    };
  }

  getOrderBookWs(pair: string) {
    const orderbooks: OrderBookSchema = {
      ts: new Date(),
      pair,
      bids: _.filter(this.obCache[pair], ob => ob[2] > 0).map(this.formatOrderBookItem),
      asks: _.filter(this.obCache[pair], ob => ob[2] < 0).map(this.formatOrderBookItem),
    };
    if (orderbooks.asks.length == 0 || orderbooks.bids.length === 0) {
      console.error(`invalid bids or asks this.obCache[pair] ${pair}`, this.obCache[pair]);
    }
    this.lastObWsTime = new Date();
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
