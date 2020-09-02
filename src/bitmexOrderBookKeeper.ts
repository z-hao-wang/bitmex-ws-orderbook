import * as _ from 'lodash';
import { BitmexRequest } from 'bitmex-request';
import * as traderUtils from './utils/traderUtils';
import { sortByAsc, sortByDesc, verifyObPollVsObWs } from './utils/parsingUtils';
import { idToPrice } from './utils/bitmexUtils';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { sortedFindIndex } from './utils/searchUtils';
import { InternalOb } from './types/shared.type';
import { findBestBid, findBestAsk, buildFromOrderedOb, reverseBuildIndex } from './utils/orderdOrderbookUtils';

// new method is much much faster than old one
const USING_NEW_METHOD = true;

export namespace BitmexOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
    verifyWithOldMethod?: boolean;
  }
}

export class BitmexOrderBookKeeper extends BaseKeeper {
  protected storedObs: Record<string, Record<string, InternalOb>> = {};
  protected testnet: boolean;
  protected bitmexRequest: BitmexRequest;
  protected storedObsOrdered: Record<string, InternalOb[]> = {};
  protected currentSplitIndex: Record<string, number> = {};
  protected verifyWithOldMethod = false;
  name = 'bitmexObKeeper';

  VERIFY_OB_PERCENT = 0;
  VALID_OB_WS_GAP = 20 * 1000;

  constructor(options: BitmexOrderBookKeeper.Options) {
    super(options);
    this.testnet = options.testnet || false;
    this.bitmexRequest = new BitmexRequest({ testnet: this.testnet });
    this.initLogger();
    this.verifyWithOldMethod = options.verifyWithOldMethod || false;
  }

  protected bitmexObToInternalOb(ob: BitmexOb.OBRow): InternalOb {
    return {
      s: ob.side === 'Buy' ? 0 : 1,
      r: ob.price,
      a: ob.size,
      id: ob.id,
    };
  }

  // either parsed object or raw text
  onSocketMessage(msg: any) {
    try {
      const res = _.isString(msg) ? JSON.parse(msg) : msg;
      const { table, action, data } = res;
      // this logic is similar with transaction_flow/ob_bitmex_fx.ts
      if (table === 'orderBookL2_25' || table === 'orderBookL2') {
        if (data.length === 0) {
          this.logger.warn(`_saveWsObData empty obRows`);
          return;
        }
        const pair = data[0].symbol;
        this.onReceiveOb(data, action, pair);
        this.lastObWsTime = new Date();
        if (this.enableEvent) {
          this.emit(`orderbook`, this.getOrderBookWs(pair));
        }
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  // directly use this for process backtesting data.
  onReceiveOb(obRows: BitmexOb.OrderBookItem[], action: string, pair: string) {
    if (action === 'partial') {
      // this means the websocket is probably reinitialized. we need to reconstruct the whole orderbook
      this.storedObs[pair] = {};
      this.storedObsOrdered[pair] = [];
    }
    this.storedObs[pair] = this.storedObs[pair] || {};
    this.storedObsOrdered[pair] = this.storedObsOrdered[pair] || [];
    if (_.includes(['partial', 'insert'], action)) {
      // first init, refresh ob data.
      _.each(obRows, row => {
        this.storedObs[pair][String(row.id)] = this.bitmexObToInternalOb(row);
        const newRowRef = this.storedObs[pair][String(row.id)];
        if (this.storedObsOrdered[pair].length === 0) {
          this.storedObsOrdered[pair].push(newRowRef);
        } else if (row.price > _.last(this.storedObsOrdered[pair])!.r) {
          this.storedObsOrdered[pair].push(newRowRef);
        } else if (row.price < _.first(this.storedObsOrdered[pair])!.r) {
          this.storedObsOrdered[pair].unshift(newRowRef);
        } else {
          // try to find the price using binary search first. slightly faster.
          const foundIndex =
            action === 'insert' ? sortedFindIndex(this.storedObsOrdered[pair], row.price, x => x.r) : -1;
          if (foundIndex !== -1) {
            this.storedObsOrdered[pair][foundIndex] = newRowRef;
          } else {
            // if not found, insert with new price.
            for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
              if (row.price < this.storedObsOrdered[pair][i].r) {
                this.storedObsOrdered[pair].splice(i, 0, newRowRef);
                break;
              }
            }
          }
        }
        // ensure the data is ordered (DEBUG only)
        // for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
        //   if (i > 0 && this.storedObsOrdered[pair][i].price < this.storedObsOrdered[pair][i - 1].price) {
        //     console.error(`invalid order, `, this.storedObsOrdered[pair])
        //   }
        // }
      });
      // reverse build index
      reverseBuildIndex(this.storedObsOrdered[pair], this.storedObs[pair]);
    } else if (action === 'update') {
      // if this order exists, we update it, otherwise don't worry
      _.each(obRows, row => {
        if (this.storedObs[pair][String(row.id)]) {
          // must update one by one because update doesn't contain price
          const obRowInternal = this.bitmexObToInternalOb(row);
          this.storedObs[pair][String(row.id)].a = obRowInternal.a;
          if (this.storedObs[pair][String(row.id)].s !== obRowInternal.s) {
            this.storedObs[pair][String(row.id)].s = obRowInternal.s;
            this.currentSplitIndex[pair] = this.storedObs[pair][String(row.id)].idx!;
          }
        } else {
          // get price from id and insert this price
          const isEth = !!pair.match(/ETH/);
          const price = idToPrice(isEth ? 'ETH' : 'BTC', row.id);
          const foundIndex = sortedFindIndex(this.storedObsOrdered[pair], price, x => x.r);
          this.storedObs[pair][String(row.id)] = this.bitmexObToInternalOb({ ...row, price });
          const newRowRef = this.storedObs[pair][String(row.id)];
          if (foundIndex !== -1) {
            this.storedObsOrdered[pair][foundIndex] = newRowRef;
          } else {
            // if not found, insert with new price.
            for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
              if (row.price < this.storedObsOrdered[pair][i].r) {
                this.storedObsOrdered[pair].splice(i, 0, newRowRef);
                break;
              }
            }
          }

          const errMsg = `${this.name} update ${row.id} does not exist in currentObMap ${JSON.stringify(newRowRef)}`;
          if (!this.silentMode) {
            this.logger.error(errMsg);
          }
        }
      });
    } else if (action === 'delete') {
      _.each(obRows, row => {
        if (this.storedObs[pair][String(row.id)]) {
          const idx = this.storedObs[pair][String(row.id)].idx!;
          this.storedObsOrdered[pair][idx].a = 0;
          delete this.storedObs[pair][String(row.id)];
        }
      });
    }
  }

  getSplitIndex(pair: string) {
    if (!this.currentSplitIndex[pair]) {
      return Math.floor(this.storedObsOrdered[pair].length / 2);
    }
    return this.currentSplitIndex[pair];
  }

  getOrderBookRaw(pair: string): Record<string, InternalOb> {
    return this.storedObs[pair];
  }

  getOrderBookWsOld(pair: string, depth: number = 25): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    // old method, slow
    const bidsUnsortedRaw = _.filter(dataRaw, o => o.s === 0 && o.a > 0);
    const askUnsortedRaw = _.filter(dataRaw, o => o.s === 1 && o.a > 0);
    const bids: OrderBookItem[] = _.map(sortByDesc(bidsUnsortedRaw, 'r').slice(0, depth), d => ({
      r: d.r,
      a: d.a,
    }));
    const asks: OrderBookItem[] = _.map(sortByAsc(askUnsortedRaw, 'r').slice(0, depth), d => ({
      r: d.r,
      a: d.a,
    }));

    return {
      pair,
      ts: this.lastObWsTime!,
      bids,
      asks,
    };
  }

  getOrderBookWs(pair: string, depth: number = 25): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw || this.storedObsOrdered[pair].length === 0) return null;
    if (USING_NEW_METHOD) {
      const bidI = this.findBestBid(pair).i;
      const askI = this.findBestAsk(pair).i;
      const { bids, asks } = buildFromOrderedOb({ bidI, askI, depth, storedObsOrdered: this.storedObsOrdered[pair] });
      if (this.verifyWithOldMethod) {
        const oldOb = this.getOrderBookWsOld(pair, depth)!;
        if (_.get(oldOb.asks[0], 'r') !== _.get(asks[0], 'r')) {
          console.error(`unmatching ob asks`, oldOb.asks, asks);
        }
        if (_.get(oldOb.bids[0], 'r') !== _.get(bids[0], 'r')) {
          console.error(`unmatching ob bids`, oldOb.bids, bids);
        }
      }
      return {
        pair,
        ts: this.lastObWsTime!,
        bids,
        asks,
      };
    } else {
      // old method, slow
      return this.getOrderBookWsOld(pair, depth);
    }
  }

  protected findBestBid(pair: string) {
    const splitIndex = this.getSplitIndex(pair);
    return findBestBid(splitIndex, this.storedObsOrdered[pair]);
  }

  protected findBestAsk(pair: string) {
    const splitIndex = this.getSplitIndex(pair);
    return findBestAsk(splitIndex, this.storedObsOrdered[pair]);
  }

  async pollOrderBook(pairEx: string): Promise<OrderBookSchema> {
    return await this.bitmexRequest.pollOrderBook(pairEx);
  }

  // Get WS ob, and fall back to poll. also verify ws ob with poll ob
  async getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema> {
    if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
      if (!forcePoll) this.logger.warn(`lastObWsTime=${this.lastObWsTime} is outdated, polling instead`);
      return await this.pollOrderBookWithRateLimit(pairEx);
    }
    let obPoll;

    const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
    if (verifyWithPoll) {
      obPoll = await this.pollOrderBookWithRateLimit(pairEx);
    }

    const obFromRealtime = this.getOrderBookWs(pairEx);

    if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
      if (verifyWithPoll) {
        verifyObPollVsObWs(obPoll, obFromRealtime);
      }
      return obFromRealtime;
    }

    this.logger.warn(`orderbookws not available, polling instead obWs=${obFromRealtime}`);
    if (obPoll) {
      return obPoll;
    }
    return await this.pollOrderBookWithRateLimit(pairEx);
  }
}
