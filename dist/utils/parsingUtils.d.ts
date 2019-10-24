import { OrderBookItem, OrderBookSchema } from 'bitmex-request';
export declare function isObPriceEqual(ob1: OrderBookItem, ob2: OrderBookItem): boolean;
export declare function isObAmountEqual(ob1: OrderBookItem, ob2: OrderBookItem): boolean;
export declare function isObItemEqual(ob1: OrderBookItem, ob2: OrderBookItem): false | typeof isObAmountEqual;
export declare function verifyObPollVsObWs(obPoll: OrderBookSchema | undefined | null, obWs: OrderBookSchema | null): number;
export declare function sortOrderBooks(orderBooks: OrderBookSchema): OrderBookSchema;
export declare function sortByAsc(items: any[], key?: string): any[];
export declare function sortByDesc(items: any[], key?: string): any[];
