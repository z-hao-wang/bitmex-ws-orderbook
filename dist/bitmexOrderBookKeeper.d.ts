import { BitmexRequest } from 'bitmex-request';
import * as EventEmitter from 'events';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookSchema } from 'bitmex-request';
export declare function sortByAsc(items: any[], key?: string): any[];
export declare function sortByDesc(items: any[], key?: string): any[];
export declare namespace BitmexOrderBookKeeper {
    interface Options {
        testnet?: boolean;
        enableEvent?: boolean;
    }
}
export declare class BitmexOrderBookKeeper extends EventEmitter {
    protected lastObWsTime?: Date;
    protected storedObs: Record<string, Record<string, BitmexOb.OBRow>>;
    protected testnet: boolean;
    protected enableEvent: boolean;
    protected bitmexRequest: BitmexRequest;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    protected _saveWsObData(obRows: BitmexOb.BitmexOrderBookItem[], action: string): void;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
    protected _getCurrentRealTimeOB(pair: string): OrderBookSchema | null;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
