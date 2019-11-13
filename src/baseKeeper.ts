import * as EventEmitter from 'events';
import { Logger, RateLimit } from 'el-logger';
import { OrderBookSchema } from 'bitmex-request';

export class BaseKeeper extends EventEmitter {
  protected logger: Logger;
  name = 'default'; // override this
  cachedPollOrderBook: Record<string, OrderBookSchema> = {};

  constructor() {
    super();
    this.logger = new Logger({ name: this.name });
  }

  // once per 2 seconds
  pollingRateLimiter = new RateLimit(1, 2);

  async pollOrderBook(pairEx: string): Promise<OrderBookSchema> {
    throw new Error(`must override pollOrderBook`);
  }

  async pollOrderBookWithRateLimit(pairEx: string) {
    // apply some sort of rate limit to this, otherwise it may go crazy.
    return new Promise<OrderBookSchema>((resolve, reject) => {
      try {
        const ran = this.pollingRateLimiter.run(async () => {
          this.cachedPollOrderBook[pairEx] = await this.pollOrderBook(pairEx);
          resolve(this.cachedPollOrderBook[pairEx]);
        });
        if (!ran) {
          resolve(this.cachedPollOrderBook[pairEx]);
        }
      } catch (e) {
        reject(null);
      }
    });
  }
}
