import * as _ from 'lodash';
import { pollOrderBook } from './utils/bitmexRequest';
import * as traderUtils from './utils/traderUtils';
import { sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import * as EventEmitter from 'events';
import * as moment from 'moment';
import { BitmexOb } from './types/bitmex.type';

export function sortByAsc(items: any[], key?: string) {
  if (key) {
    return items.sort((a, b) => a[key] - b[key]);
  }
  return items.sort((a, b) => a - b);
}

export function sortByDesc(items: any[], key?: string) {
  if (key) {
    return items.sort((a, b) => b[key] - a[key]);
  }
  return items.sort((a, b) => b - a);
}

export namespace BitmexOrderBookKeeper {
  export interface Options {
    testnet?: boolean;
    enableEvent?: boolean;
  }
}

export class BitmexOrderBookKeeper extends EventEmitter {
  protected lastObWsTime?: Date;
  protected storedObs: Record<string, Record<string, BitmexOb.OBRow>> = {};
  protected testnet: boolean;
  protected enableEvent: boolean;

  VERIFY_OB_PERCENT = 0;
  VALID_OB_WS_GAP = 20 * 1000;

  constructor(options: BitmexOrderBookKeeper.Options) {
    super();
    this.testnet = options.testnet || false;
    this.enableEvent = options.enableEvent || false;
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
      console.error(moment().format('YYYY-MM-DD HH:mm:ss'), e);
    }
  }

  protected _saveWsObData(obRows: BitmexOb.BitmexOrderBookItem[], action: string) {
    if (obRows.length === 0) {
      console.warn(moment().format('YYYY-MM-DD HH:mm:ss') + ` empty obRows`);
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
          const errMsg = moment().format('YYYY-MM-DD HH:mm:ss') + ` update ${row.id} does not exist in currentObMap`;
          console.error(errMsg);
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
      this.emit(`orderbook`, this._getCurrentRealTimeOB(pair));
    }
  }

  onOrderBookUpdated(callback: (ob: BitmexOb.OrderBookSchema) => any) {
    this.on('orderbook', callback);
  }

  protected _getCurrentRealTimeOB(pair: string): BitmexOb.OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
    const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
    const bidsUnsorted: BitmexOb.OrderBookItem[] = _.map(bidsUnsortedRaw, d => ({ r: d.price, a: d.size }));
    const asksUnsorted: BitmexOb.OrderBookItem[] = _.map(askUnsortedRaw, d => ({ r: d.price, a: d.size }));

    return sortOrderBooks({
      pair,
      ts: this.lastObWsTime!,
      bids: bidsUnsorted,
      asks: asksUnsorted,
    });
  }

  // Get WS ob, and fall back to poll. also verify ws ob with poll ob
  async getOrderBook(pair: string, forcePoll?: boolean): Promise<BitmexOb.OrderBookSchema> {
    if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
      if (!forcePoll)
        console.warn(
          moment().format('YYYY-MM-DD HH:mm:ss') +
            ` this.lastObWsTime=${this.lastObWsTime} is outdated, polling instead`,
        );
      return await pollOrderBook(pair, this.testnet);
    }
    let obPoll;

    const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
    if (verifyWithPoll) {
      obPoll = await pollOrderBook(pair, this.testnet);
    }

    const obFromRealtime = this._getCurrentRealTimeOB(pair);

    if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
      if (verifyWithPoll) {
        verifyObPollVsObWs(obPoll, obFromRealtime);
      }
      return obFromRealtime;
    }

    console.warn(
      moment().format('YYYY-MM-DD HH:mm:ss') + ` orderbookws not available, polling instead obWs=${obFromRealtime}`,
    );
    return await pollOrderBook(pair, this.testnet);
  }
}
