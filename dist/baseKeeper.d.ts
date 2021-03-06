/// <reference types="node" />
import * as EventEmitter from 'events';
import { Logger, RateLimit } from 'el-logger';
import { OrderBookSchema } from 'bitmex-request';
export declare namespace BaseKeeper {
    interface Options {
        enableEvent?: boolean;
        silentMode?: boolean;
    }
}
export declare class BaseKeeper extends EventEmitter {
    protected logger: Logger;
    lastObWsTime?: Date;
    name: string;
    cachedPollOrderBook: Record<string, OrderBookSchema>;
    protected enableEvent: boolean;
    protected silentMode: boolean;
    constructor(options: BaseKeeper.Options);
    initLogger(): void;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
    pollingRateLimiter: RateLimit;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    pollOrderBookWithRateLimit(pairEx: string): Promise<OrderBookSchema>;
}
