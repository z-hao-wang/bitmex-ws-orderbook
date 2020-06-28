"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const searchUtils_1 = require("./searchUtils");
class GenericObKeeperShared {
    constructor() {
        this.bids = [];
        this.asks = [];
    }
    init() {
        this.bids = [];
        this.asks = [];
    }
    // if initial, return true
    onReceiveOb(params) {
        // deal with special cases, the bid cannot be greater than ask.
        if (params.asks.length > 0) {
            while (this.bids.length > 0 && this.bids[0].r >= params.asks[0].r) {
                this.bids.splice(0, 1);
            }
        }
        if (params.bids.length > 0) {
            while (this.asks.length > 0 && this.asks[0].r <= params.bids[0].r) {
                this.asks.splice(0, 1);
            }
        }
        for (let bid of params.bids) {
            if (!bid || !bid.r) {
                console.error(`invalid bid`, bid);
                continue;
            }
            if (this.bids.length === 0) {
                // insert if empty
                this.bids.push(bid);
            }
            else {
                // if bid is too low than whole book, push at bottom
                if (bid.r < _.last(this.bids).r) {
                    bid.a > 0 && this.bids.push(bid);
                }
                else if (bid.r > _.first(this.bids).r) {
                    bid.a > 0 && this.bids.unshift(bid);
                }
                else {
                    const foundIndex = searchUtils_1.sortedFindFirstSmallerEqual(this.bids, bid.r, b => b.r);
                    if (foundIndex === -1) {
                        console.error(`invalid condition, did not found index bid`, bid, this.bids);
                    }
                    else {
                        if (this.bids[foundIndex].r === bid.r) {
                            if (bid.a === 0) {
                                // delete
                                this.bids.splice(foundIndex, 1);
                            }
                            else {
                                // replace
                                this.bids[foundIndex] = bid;
                            }
                        }
                        else {
                            // insert
                            if (bid.a > 0) {
                                this.bids.splice(foundIndex, 0, bid);
                            }
                        }
                    }
                }
            }
        }
        for (let ask of params.asks) {
            if (!ask || !ask.r) {
                console.error(`invalid ask`, ask);
                continue;
            }
            // ask ordered from best to worst, from lowest to highest.
            if (this.asks.length === 0) {
                this.asks.push(ask);
            }
            else {
                if (ask.r > _.last(this.asks).r) {
                    ask.a > 0 && this.asks.push(ask);
                }
                else if (ask.r < _.first(this.asks).r) {
                    ask.a > 0 && this.asks.unshift(ask);
                }
                else {
                    const foundIndex = searchUtils_1.sortedFindFirstGreaterEqual(this.asks, ask.r, a => a.r);
                    if (foundIndex === -1) {
                        console.error(`invalid condition, did not found index ask`, ask, this.asks);
                    }
                    else {
                        if (this.asks[foundIndex].r === ask.r) {
                            if (ask.a === 0) {
                                // delete
                                this.asks.splice(foundIndex, 1);
                            }
                            else {
                                // replace
                                this.asks[foundIndex] = ask;
                            }
                        }
                        else {
                            // insert
                            if (ask.a > 0) {
                                this.asks.splice(foundIndex, 0, ask);
                            }
                        }
                    }
                }
            }
        }
    }
    getOb(depth) {
        return { asks: depth ? this.asks.slice(0, depth) : this.asks, bids: depth ? this.bids.slice(0, depth) : this.bids };
    }
}
exports.GenericObKeeperShared = GenericObKeeperShared;
