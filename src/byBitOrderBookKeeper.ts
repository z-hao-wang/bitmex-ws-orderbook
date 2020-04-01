import * as _ from 'lodash';
import { BybitRequest } from 'bitmex-request';
import * as traderUtils from './utils/traderUtils';
import { sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import { BybitOb } from './types/bybit.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';

export namespace BybitOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
  }
}

export class BybitOrderBookKeeper extends BaseKeeper {
  protected storedObs: Record<string, Record<string, BybitOb.OBRow>> = {};
  protected testnet: boolean;
  protected bybitRequest: BybitRequest;
  name = 'bybitObKeeper';

  VERIFY_OB_PERCENT = 0.1;
  VALID_OB_WS_GAP = 20 * 1000;

  constructor(options: BybitOrderBookKeeper.Options) {
    super(options);
    this.testnet = options.testnet || false;
    this.bybitRequest = new BybitRequest({ testnet: this.testnet });

    this.initLogger();
  }

  // either parsed object or raw text
  onSocketMessage(msg: any) {
    try {
      const res = _.isString(msg) ? JSON.parse(msg) : msg;
      const pairMatch = res && res.topic.match(/^orderBookL2_25\.(.*)/);
      const pair = pairMatch && pairMatch[1];
      if (pair) {
        this.storedObs[pair] = this.storedObs[pair] || {};
        this.onReceiveOb(res);
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  onReceiveOb(obs: BybitOb.OrderBooks, _pair?: string) {
    // for rebuilding orderbook process.
    if (_pair) {
      this.storedObs[_pair] = this.storedObs[_pair] || {};
    }
    if (_.includes(['snapshot'], obs.type)) {
      // first init, refresh ob data.
      const obRows = (obs as BybitOb.OrderBooksNew).data;
      _.each(obRows, row => {
        const pair = _pair || row.symbol;
        this.storedObs[pair][String(row.id)] = row;
      });
    } else if (obs.type === 'delta') {
      // if this order exists, we update it, otherwise don't worry
      _.each((obs as BybitOb.OrderBooksDelta).data.update, row => {
        const pair = _pair || row.symbol;
        if (this.storedObs[pair][String(row.id)]) {
          // must update one by one because update doesn't contain price
          this.storedObs[pair][String(row.id)].size = row.size;
          this.storedObs[pair][String(row.id)].side = row.side;
        }
      });
      _.each((obs as BybitOb.OrderBooksDelta).data.insert, row => {
        const pair = _pair || row.symbol;
        this.storedObs[pair][String(row.id)] = row;
      });
      _.each((obs as BybitOb.OrderBooksDelta).data.delete, row => {
        const pair = _pair || row.symbol;
        delete this.storedObs[pair][String(row.id)];
      });
    }

    this.lastObWsTime = new Date();
    if (this.enableEvent) {
      this.emit(`orderbook`, this.getOrderBookWs(obs.topic.match(/orderBookL2_25\.(.*)/)![1]));
    }
  }

  getOrderBookWs(pair: string, depth: number = 25): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    const bidsUnsortedRaw = _.filter(dataRaw, o => o.side === 'Buy' && o.size > 0);
    const askUnsortedRaw = _.filter(dataRaw, o => o.side === 'Sell' && o.size > 0);
    const bidsUnsorted: OrderBookItem[] = _.map(bidsUnsortedRaw, d => ({ r: +d.price, a: d.size }));
    const asksUnsorted: OrderBookItem[] = _.map(askUnsortedRaw, d => ({ r: +d.price, a: d.size }));

    return sortOrderBooks({
      pair,
      ts: this.lastObWsTime!,
      bids: bidsUnsorted.slice(0, depth),
      asks: asksUnsorted.slice(0, depth),
    });
  }

  async pollOrderBook(pairEx: string): Promise<OrderBookSchema> {
    return await this.bybitRequest.pollOrderBook(pairEx);
  }

  // Get WS ob, and fall back to poll. also verify ws ob with poll ob
  async getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema> {
    if (forcePoll || !traderUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
      if (!forcePoll)
        this.logger.warn(
          `lastObWsTime=${this.lastObWsTime && this.lastObWsTime.toISOString()} is outdated diff=(${Date.now() -
            (this.lastObWsTime ? this.lastObWsTime.getTime() : 0)}), polling instead`,
        );
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
