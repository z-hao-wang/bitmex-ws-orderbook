import { BybitRequest } from 'bitmex-request';
import { BybitOb } from './types/bybit.type';
import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';
export declare namespace BybitOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
    }
}
export declare class BybitOrderBookKeeper extends BaseKeeper {
    obKeepers: Record<string, GenericObKeeperShared>;
    onReceiveObShared(params: {
        pair: string;
        bids: OrderBookItem[];
        asks: OrderBookItem[];
        isNewSnapshot?: boolean;
    }): void;
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
    protected testnet: boolean;
    protected bybitRequest: BybitRequest;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BybitOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    onReceiveOb(obs: BybitOb.OrderBooks, _pair?: string): void;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
