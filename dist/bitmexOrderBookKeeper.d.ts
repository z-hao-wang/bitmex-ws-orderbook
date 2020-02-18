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
    protected storedObs: Record<string, Record<string, BitmexOb.OBRow>>;
    protected testnet: boolean;
    protected bitmexRequest: BitmexRequest;
    protected storedObsOrdered: Record<string, BitmexOb.OBRow[]>;
    protected currentSplitIndex: number;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    onReceiveOb(obRows: BitmexOb.OrderBookItem[], action: string, pair: string): void;
    getOrderBookRaw(pair: string): Record<string, BitmexOb.OBRow>;
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema | null;
    protected findBestBid(pair: string): {
        i: number;
        bid: BitmexOb.OBRow;
    };
    protected findBestAsk(pair: string): {
        i: number;
        ask: BitmexOb.OBRow;
    };
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
