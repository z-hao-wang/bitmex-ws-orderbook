import * as _ from 'lodash';
import { BitmexRequest } from 'bitmex-request';
import * as traderUtils from './utils/traderUtils';
import { sortByAsc, sortByDesc, sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';

// new method is much much faster than old one
const USING_NEW_METHOD = true;

export namespace BitmexOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
    verifyWithOldMethod?: boolean;
  }

  export interface InternalOb {
    s: 0 | 1;
    r: number;
    a: number;
    id: number;
    idx?: number;
  }
}

export class BitmexOrderBookKeeper extends BaseKeeper {
  protected storedObs: Record<string, Record<string, BitmexOrderBookKeeper.InternalOb>> = {};
  protected testnet: boolean;
  protected bitmexRequest: BitmexRequest;
  protected storedObsOrdered: Record<string, BitmexOrderBookKeeper.InternalOb[]> = {};
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

  protected bitmexObToInternalOb(ob: BitmexOb.OBRow): BitmexOrderBookKeeper.InternalOb {
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
      if (table === 'orderBookL2_25') {
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
          for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
            if (row.price === this.storedObsOrdered[pair][i].r) {
              this.storedObsOrdered[pair][i] = newRowRef;
              break;
            } else if (row.price < this.storedObsOrdered[pair][i].r) {
              this.storedObsOrdered[pair].splice(i, 0, newRowRef);
              break;
            }
          }
        }
        // ensure the data is ordered
        // for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
        //   if (i > 0 && this.storedObsOrdered[pair][i].price < this.storedObsOrdered[pair][i - 1].price) {
        //     console.error(`invalid order, `, this.storedObsOrdered[pair])
        //   }
        // }
      });
      // reverse build index
      _.each(this.storedObsOrdered[pair], (o, i) => {
        // undefined is allowed due to it can be deleted
        if (this.storedObs[pair][String(o.id)]) {
          this.storedObs[pair][String(o.id)].idx = i;
        }
      });
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
          const errMsg = `${this.name} update ${row.id} does not exist in currentObMap`;
          this.logger.error(errMsg);
          this.emit(`error`, errMsg);
        }
      });
    } else if (action === 'delete') {
      _.each(obRows, row => {
        const idx = this.storedObs[pair][String(row.id)].idx!;
        this.storedObsOrdered[pair][idx].a = 0;
        delete this.storedObs[pair][String(row.id)];
      });
    }
  }

  getSplitIndex(pair: string) {
    if (!this.currentSplitIndex[pair]) {
      return Math.floor(this.storedObsOrdered[pair].length / 2);
    }
    return this.currentSplitIndex[pair];
  }

  getOrderBookRaw(pair: string): Record<string, BitmexOrderBookKeeper.InternalOb> {
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
    if (!dataRaw) return null;
    if (USING_NEW_METHOD) {
      const bidI = this.findBestBid(pair).i;
      const askI = this.findBestAsk(pair).i;
      const asks: OrderBookItem[] = [];
      const bids: OrderBookItem[] = [];
      const storedOrdered = this.storedObsOrdered[pair];
      for (let i = bidI; i >= 0 && bids.length < depth; i--) {
        const item = storedOrdered[i];
        if (item.a > 0) {
          bids.push({
            r: item.r,
            a: item.a,
          });
        }
      }
      for (let i = askI; i < storedOrdered.length && asks.length < depth; i++) {
        const item = storedOrdered[i];
        if (item.a > 0) {
          asks.push({
            r: item.r,
            a: item.a,
          });
        }
      }
      if (this.verifyWithOldMethod) {
        const oldOb = this.getOrderBookWsOld(pair, depth)!;
        if (oldOb.asks[0].r !== asks[0].r) {
          console.error(`unmatching ob asks`, oldOb.asks, storedOrdered);
        }
        if (oldOb.bids[0].r !== bids[0].r) {
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
    let i = splitIndex;
    const sideSplit = this.storedObsOrdered[pair][splitIndex].s;
    if (sideSplit === 0) {
      // go down until we see Sell
      while (
        i < this.storedObsOrdered[pair].length &&
        (this.storedObsOrdered[pair][i].s === 0 || this.storedObsOrdered[pair][i].a === 0)
      ) {
        i++;
      }
      return { i: i - 1, bid: this.storedObsOrdered[pair][i - 1] };
    } else {
      // go up until we see first buy
      while (i > 0 && (this.storedObsOrdered[pair][i].s === 1 || this.storedObsOrdered[pair][i].a === 0)) {
        i--;
      }
      return { i: i, bid: this.storedObsOrdered[pair][i] };
    }
  }

  protected findBestAsk(pair: string) {
    const splitIndex = this.getSplitIndex(pair);
    let i = splitIndex;
    const sideSplit = this.storedObsOrdered[pair][splitIndex].s;
    if (sideSplit === 0) {
      // go down until we see Sell
      while (
        i < this.storedObsOrdered[pair].length &&
        (this.storedObsOrdered[pair][i].s === 0 || this.storedObsOrdered[pair][i].a === 0)
      ) {
        i++;
      }
      return { i: i, ask: this.storedObsOrdered[pair][i] };
    } else {
      // go up until we see first buy
      while (i >= 0 && (this.storedObsOrdered[pair][i].s === 1 || this.storedObsOrdered[pair][i].a === 0)) {
        i--;
      }
      return { i: i + 1, ask: this.storedObsOrdered[pair][i + 1] };
    }
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
