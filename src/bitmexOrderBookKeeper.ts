import * as _ from 'lodash';
import { BitmexRequest } from 'bitmex-request';
import * as traderUtils from './utils/traderUtils';
import { sortByAsc, sortByDesc, sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';

export namespace BitmexOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
  }
}

export class BitmexOrderBookKeeper extends BaseKeeper {
  protected storedObs: Record<string, Record<string, BitmexOb.OBRow>> = {};
  protected testnet: boolean;
  protected bitmexRequest: BitmexRequest;
  protected storedObsOrdered: Record<string, BitmexOb.OBRow[]> = {};
  protected currentSplitIndex = 0;
  name = 'bitmexObKeeper';

  VERIFY_OB_PERCENT = 0;
  VALID_OB_WS_GAP = 20 * 1000;

  constructor(options: BitmexOrderBookKeeper.Options) {
    super(options);
    this.testnet = options.testnet || false;
    this.bitmexRequest = new BitmexRequest({ testnet: this.testnet });

    this.initLogger();
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
        this.storedObs[pair][String(row.id)] = row;
        const newRowRef = this.storedObs[pair][String(row.id)];
        if (this.storedObsOrdered[pair].length === 0) {
          this.storedObsOrdered[pair].push(newRowRef);
        } else if (row.price > _.last(this.storedObsOrdered[pair])!.price) {
          this.storedObsOrdered[pair].push(newRowRef);
        } else if (row.price < _.first(this.storedObsOrdered[pair])!.price) {
          this.storedObsOrdered[pair].unshift(newRowRef);
        } else {
          for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
            if (row.price === this.storedObsOrdered[pair][i].price) {
              this.storedObsOrdered[pair][i] = newRowRef;
              break;
            } else if (row.price > this.storedObsOrdered[pair][i].price) {
              this.storedObsOrdered[pair].splice(i, 0, newRowRef);
              break;
            }
          }
        }
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
          this.storedObs[pair][String(row.id)].size = row.size;
          if (this.storedObs[pair][String(row.id)].side !== row.side) {
            this.storedObs[pair][String(row.id)].side = row.side;
            this.currentSplitIndex = this.storedObs[pair][String(row.id)].idx!;
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
        this.storedObsOrdered[pair][idx].size = 0;
        delete this.storedObs[pair][String(row.id)];
      });
    }
  }

  getOrderBookRaw(pair: string): Record<string, BitmexOb.OBRow> {
    return this.storedObs[pair];
  }

  getOrderBookWs(pair: string, depth: number = 5): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;

    if (1) {
      const bidI = this.findBestBid(pair).i;
      const askI = this.findBestAsk(pair).i;
      const asks: OrderBookItem[] = [];
      const bids: OrderBookItem[] = [];
      const storedOrdered = this.storedObsOrdered[pair];
      for (let i = bidI; i >= 0 && bids.length < depth; i--) {
        const item = storedOrdered[i];
        if (item.size > 0) {
          bids.push({
            r: item.price,
            a: item.size,
          });
        }
      }
      for (let i = askI; i <= storedOrdered.length && asks.length < depth; i++) {
        const item = storedOrdered[i];
        if (item.size > 0) {
          asks.push({
            r: item.price,
            a: item.size,
          });
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
      const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
      const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
      const bids: OrderBookItem[] = _.map(sortByDesc(bidsUnsortedRaw, 'price').slice(0, depth), d => ({
        r: d.price,
        a: d.size,
      }));
      const asks: OrderBookItem[] = _.map(sortByAsc(askUnsortedRaw, 'price').slice(0, depth), d => ({
        r: d.price,
        a: d.size,
      }));

      return {
        pair,
        ts: this.lastObWsTime!,
        bids,
        asks,
      };
    }
  }

  protected findBestBid(pair: string) {
    let i = this.currentSplitIndex;
    const sideSplit = this.storedObsOrdered[pair][this.currentSplitIndex].side;
    if (sideSplit === 'Buy') {
      // go down until we see Sell
      while (i < this.storedObsOrdered[pair].length && this.storedObsOrdered[pair][i].side === 'Buy') {
        i++;
      }
      return { i: i - 1, bid: this.storedObsOrdered[pair][i - 1] };
    } else {
      // go up until we see first buy
      while (i >= 0 && this.storedObsOrdered[pair][i].side === 'Sell') {
        i--;
      }
      return { i: i, bid: this.storedObsOrdered[pair][i] };
    }
  }

  protected findBestAsk(pair: string) {
    let i = this.currentSplitIndex;
    const sideSplit = this.storedObsOrdered[pair][this.currentSplitIndex].side;
    if (sideSplit === 'Buy') {
      // go down until we see Sell
      while (i < this.storedObsOrdered[pair].length && this.storedObsOrdered[pair][i].side === 'Buy') {
        i++;
      }
      return { i: i, ask: this.storedObsOrdered[pair][i] };
    } else {
      // go up until we see first buy
      while (i >= 0 && this.storedObsOrdered[pair][i].side === 'Sell') {
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
