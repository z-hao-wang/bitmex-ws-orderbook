import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
/**
 * [ 11153,
 [ [ 152.47, 2, 40.50152043 ],
 [ 152.35, 1, 0.68514292 ],
 [ 152.34, 2, 11.3 ],
 [ 152.32, 2, 13 ],
 [ 152.48, 6, -8.18084404 ],
 [ 152.49, 1, -14.31512963 ],
 [ 152.5, 2, -25.52159388 ],
 [ 152.51, 2, -6 ],
 [ 152.53, 1, -70 ],
 */
/**
 * when count > 0 then you have to add or update the price level
 3.1 if amount > 0 then add/update bids
 3.2 if amount < 0 then add/update asks
 when count = 0 then you have to delete the price level.
 4.1 if amount = 1 then remove from bids
 4.2 if amount = -1 then remove from asks
 */
export declare namespace BitfinexObKeeper {
    interface Options {
        enableEvent?: boolean;
    }
}
export declare class BitfinexObKeeper extends BaseKeeper {
    obCache: Record<string, number[][]>;
    onReceiveOb(pair: string, _data: number[][] | number[]): boolean;
    formatOrderBookItem(orderBookItem: number[]): OrderBookItem;
    getOrderBookWs(pair: string): OrderBookSchema;
    getOrderBook(pair: string): Promise<OrderBookSchema>;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
}
