import { OrderBookSchema, OrderBookItem } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
/**
 {
    "type": "snapshot",
    "product_id": "BTC-USD",
    "bids": [["10101.10", "0.45054140"]],
    "asks": [["10102.55", "0.57753524"]]
}
 {
  "type": "l2update",
  "product_id": "BTC-USD",
  "time": "2019-08-14T20:42:27.265Z",
  "changes": [
    [
      "buy",
      "10101.80000000",
      "0.162567"
    ]
  ]
}
 */
/**
 Subsequent updates will have the type l2update. The changes property of l2updates is an array with [side, price, size] tuples. The time property of l2update is the time of the event as recorded by our trading engine. Please note that size is the updated size at that price level, not a delta. A size of "0" indicates the price level can be removed.
 */
export declare namespace GdaxObKeeper {
    interface OrderBookRealtimeSnap {
        type: 'snapshot';
        product_id: string;
        bids: string[][];
        asks: string[][];
    }
    interface OrderBookRealtimeChange {
        type: 'l2update';
        product_id: string;
        time: Date;
        changes: string[][];
    }
    type OrderBookRealtime = OrderBookRealtimeSnap | OrderBookRealtimeChange;
}
export declare class GdaxObKeeper extends BaseKeeper {
    obCache: Record<string, {
        bids: number[][];
        asks: number[][];
    }>;
    onSocketMessage(msg: any): void;
    convertToNum(items: string[]): number[];
    performObUpdate(data: GdaxObKeeper.OrderBookRealtimeChange): void;
    formatOrderBookItem(orderBookItem: number[]): OrderBookItem;
    getOrderBookWs(pair: string): OrderBookSchema;
    getOrderBook(pair: string): Promise<OrderBookSchema>;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
}
