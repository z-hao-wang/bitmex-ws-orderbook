import { BitmexRequest } from 'bitmex-request';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
export declare namespace BitmexOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
    }
}
export declare class BitmexOrderBookKeeper extends BaseKeeper {
    protected lastObWsTime?: Date;
    protected storedObs: Record<string, Record<string, BitmexOb.OBRow>>;
    protected testnet: boolean;
    protected bitmexRequest: BitmexRequest;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    protected _saveWsObData(obRows: BitmexOb.OrderBookItem[], action: string): void;
    getOrderBookWs(pair: string): OrderBookSchema | null;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
