import * as _ from 'lodash';
import { BitmexRequest } from 'bitmex-request';
import * as traderUtils from './utils/traderUtils';
import { sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';

export namespace BitmexOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
  }
}

export class BitmexOrderBookKeeper extends BaseKeeper {
  protected lastObWsTime?: Date;
  protected storedObs: Record<string, Record<string, BitmexOb.OBRow>> = {};
  protected testnet: boolean;
  protected bitmexRequest: BitmexRequest;
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
        this._saveWsObData(data, action);
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  protected _saveWsObData(obRows: BitmexOb.OrderBookItem[], action: string) {
    if (obRows.length === 0) {
      this.logger.warn(`_saveWsObData empty obRows`);
      return;
    }
    const pair = obRows[0].symbol;
    this.storedObs[pair] = this.storedObs[pair] || {};
    if (_.includes(['partial', 'insert'], action)) {
      // first init, refresh ob data.
      _.each(obRows, row => {
        this.storedObs[pair][String(row.id)] = row;
      });
    } else if (action === 'update') {
      // if this order exists, we update it, otherwise don't worry
      _.each(obRows, row => {
        if (this.storedObs[pair][String(row.id)]) {
          // must update one by one because update doesn't contain price
          this.storedObs[pair][String(row.id)].size = row.size;
          this.storedObs[pair][String(row.id)].side = row.side;
        } else {
          const errMsg = `${this.name} update ${row.id} does not exist in currentObMap`;
          this.logger.error(errMsg);
          this.emit(`error`, errMsg);
        }
      });
    } else if (action === 'delete') {
      _.each(obRows, row => {
        delete this.storedObs[pair][String(row.id)];
      });
    }

    this.lastObWsTime = new Date();
    if (this.enableEvent) {
      this.emit(`orderbook`, this.getOrderBookWs(pair));
    }
  }

  getOrderBookWs(pair: string): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
    const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
    const bidsUnsorted: OrderBookItem[] = _.map(bidsUnsortedRaw, d => ({ r: d.price, a: d.size }));
    const asksUnsorted: OrderBookItem[] = _.map(askUnsortedRaw, d => ({ r: d.price, a: d.size }));

    return sortOrderBooks({
      pair,
      ts: this.lastObWsTime!,
      bids: bidsUnsorted,
      asks: asksUnsorted,
    });
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
