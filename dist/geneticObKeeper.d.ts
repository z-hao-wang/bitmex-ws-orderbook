import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';
export declare namespace GeneticObKeeper {
    interface Options {
        enableEvent?: boolean;
    }
}
export declare class GeneticObKeeper extends BaseKeeper {
    obKeepers: Record<string, GenericObKeeperShared>;
    onReceiveOb(params: {
        pair: string;
        bids: OrderBookItem[];
        asks: OrderBookItem[];
    }): void;
    getOrderBookWs(pair: string): OrderBookSchema;
    getOrderBook(pair: string): Promise<OrderBookSchema>;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
}