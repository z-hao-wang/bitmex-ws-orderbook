"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const el_logger_1 = require("el-logger");
class BaseKeeper extends EventEmitter {
    constructor(options) {
        super();
        this.name = 'default'; // override this
        this.cachedPollOrderBook = {};
        // once per 2 seconds
        this.pollingRateLimiter = new el_logger_1.RateLimit(1, 2);
        this.enableEvent = options.enableEvent || false;
        this.silentMode = options.silentMode || false;
        this.logger = new el_logger_1.Logger({ name: this.name });
    }
    initLogger() {
        this.logger = new el_logger_1.Logger({ name: this.name });
    }
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
    }
    pollOrderBook(pairEx) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`must override pollOrderBook`);
        });
    }
    pollOrderBookWithRateLimit(pairEx) {
        return __awaiter(this, void 0, void 0, function* () {
            // apply some sort of rate limit to this, otherwise it may go crazy.
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const ran = this.pollingRateLimiter.run(() => __awaiter(this, void 0, void 0, function* () {
                        this.cachedPollOrderBook[pairEx] = yield this.pollOrderBook(pairEx);
                        resolve(this.cachedPollOrderBook[pairEx]);
                    }));
                    if (!ran) {
                        // it's possible this is first time fetching, just poll orderbook
                        if (!this.cachedPollOrderBook[pairEx]) {
                            this.cachedPollOrderBook[pairEx] = yield this.pollOrderBook(pairEx);
                        }
                        resolve(this.cachedPollOrderBook[pairEx]);
                    }
                }
                catch (e) {
                    reject(null);
                }
            }));
        });
    }
}
exports.BaseKeeper = BaseKeeper;
