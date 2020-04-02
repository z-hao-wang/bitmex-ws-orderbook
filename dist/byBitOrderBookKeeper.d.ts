import { BybitRequest } from 'bitmex-request';
import { BybitOb } from "./types/bybit.type";
import { InternalOb } from "./types/shared.type";
import { OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
export declare namespace BybitOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
    }
}
export declare class BybitOrderBookKeeper extends BaseKeeper {
    protected storedObs: Record<string, Record<string, InternalOb>>;
    protected storedObsOrdered: Record<string, InternalOb[]>;
    protected currentSplitIndex: Record<string, number>;
    protected testnet: boolean;
    protected bybitRequest: BybitRequest;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BybitOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    toInternalOb(ob: BybitOb.OBRow): InternalOb;
    private searchAndInsertObRow;
    onReceiveOb(obs: BybitOb.OrderBooks, _pair?: string): void;
    getOrderBookWsOld(pair: string, depth?: number): OrderBookSchema | null;
    protected findBestBid(pair: string): {
        i: number;
        bid: InternalOb;
    };
    protected findBestAsk(pair: string): {
        i: number;
        ask: InternalOb;
    };
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema | null;
    getSplitIndex(pair: string): number;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
