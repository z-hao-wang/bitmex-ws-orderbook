import { BitmexOb } from '../types/bitmex.type';
export declare function isObPriceEqual(ob1: BitmexOb.OrderBookItem, ob2: BitmexOb.OrderBookItem): boolean;
export declare function isObAmountEqual(ob1: BitmexOb.OrderBookItem, ob2: BitmexOb.OrderBookItem): boolean;
export declare function isObItemEqual(ob1: BitmexOb.OrderBookItem, ob2: BitmexOb.OrderBookItem): false | typeof isObAmountEqual;
export declare function verifyObPollVsObWs(obPoll: BitmexOb.OrderBookSchema | undefined | null, obWs: BitmexOb.OrderBookSchema | null): number;
export declare function sortOrderBooks(orderBooks: BitmexOb.OrderBookSchema): BitmexOb.OrderBookSchema;
