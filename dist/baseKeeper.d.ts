import * as EventEmitter from 'events';
import { Logger, RateLimit } from 'el-logger';
import { OrderBookSchema } from 'bitmex-request';
export declare class BaseKeeper extends EventEmitter {
    protected logger: Logger;
    name: string;
    cachedPollOrderBook: Record<string, OrderBookSchema>;
    constructor();
    initLogger(): void;
    pollingRateLimiter: RateLimit;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    pollOrderBookWithRateLimit(pairEx: string): Promise<OrderBookSchema>;
}
