import { BitmexRequest } from 'bitmex-request';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
export declare namespace BitmexOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
    }
    interface InternalOb {
        s: 0 | 1;
        r: number;
        a: number;
        id: number;
        idx?: number;
    }
}
export declare class BitmexOrderBookKeeper extends BaseKeeper {
    protected storedObs: Record<string, Record<string, BitmexOrderBookKeeper.InternalOb>>;
    protected testnet: boolean;
    protected bitmexRequest: BitmexRequest;
    protected storedObsOrdered: Record<string, BitmexOrderBookKeeper.InternalOb[]>;
    protected currentSplitIndex: number;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    protected bitmexObToInternalOb(ob: BitmexOb.OBRow): BitmexOrderBookKeeper.InternalOb;
    onSocketMessage(msg: any): void;
    onReceiveOb(obRows: BitmexOb.OrderBookItem[], action: string, pair: string): void;
    getOrderBookRaw(pair: string): Record<string, BitmexOrderBookKeeper.InternalOb>;
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema | null;
    protected findBestBid(pair: string): {
        i: number;
        bid: BitmexOrderBookKeeper.InternalOb;
    };
    protected findBestAsk(pair: string): {
        i: number;
        ask: BitmexOrderBookKeeper.InternalOb;
    };
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
