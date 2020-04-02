import { BitmexRequest } from 'bitmex-request';
import { BitmexOb } from './types/bitmex.type';
import { OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { InternalOb } from './types/shared.type';
export declare namespace BitmexOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
        verifyWithOldMethod?: boolean;
    }
}
export declare class BitmexOrderBookKeeper extends BaseKeeper {
    protected storedObs: Record<string, Record<string, InternalOb>>;
    protected testnet: boolean;
    protected bitmexRequest: BitmexRequest;
    protected storedObsOrdered: Record<string, InternalOb[]>;
    protected currentSplitIndex: Record<string, number>;
    protected verifyWithOldMethod: boolean;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    protected bitmexObToInternalOb(ob: BitmexOb.OBRow): InternalOb;
    onSocketMessage(msg: any): void;
    onReceiveOb(obRows: BitmexOb.OrderBookItem[], action: string, pair: string): void;
    getSplitIndex(pair: string): number;
    getOrderBookRaw(pair: string): Record<string, InternalOb>;
    getOrderBookWsOld(pair: string, depth?: number): OrderBookSchema | null;
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema | null;
    protected findBestBid(pair: string): {
        i: number;
        bid: InternalOb;
    };
    protected findBestAsk(pair: string): {
        i: number;
        ask: InternalOb;
    };
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
