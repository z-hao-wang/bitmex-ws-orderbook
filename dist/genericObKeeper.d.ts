import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';
export declare namespace GeneticObKeeper {
    interface Options {
        enableEvent?: boolean;
    }
}
export declare class GenericObKeeper extends BaseKeeper {
    obKeepers: Record<string, GenericObKeeperShared>;
    onReceiveOb(params: {
        pair: string;
        bids: OrderBookItem[];
        asks: OrderBookItem[];
        isNewSnapshot?: boolean;
    }): void;
    getOrderBookWs(pair: string, depth?: number): OrderBookSchema;
    getOrderBook(pair: string): Promise<OrderBookSchema>;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
}
