export declare function isObPriceEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem): boolean;
export declare function isObAmountEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem): boolean;
export declare function isObItemEqual(ob1: Bitmex.OrderBookItem, ob2: Bitmex.OrderBookItem): false | typeof isObAmountEqual;
export declare function verifyObPollVsObWs(obPoll: Bitmex.OrderBookSchema | undefined | null, obWs: Bitmex.OrderBookSchema | null): number;
export declare function sortOrderBooks(orderBooks: Bitmex.OrderBookSchema): Bitmex.OrderBookSchema;
