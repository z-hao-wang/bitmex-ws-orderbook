"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
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
        // bids ordered from best to worst, from highest to lowest.
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
                    for (let i = 0; i < this.bids.length; i++) {
                        if (!this.bids[i]) {
                            console.error(`invalid condition this.bids`, this.bids);
                        }
                        if (bid.a === 0 && bid.r === this.bids[i].r) {
                            // need to delete this entry.
                            this.bids.splice(i, 1);
                            i--;
                            break;
                        }
                        else if (bid.r === this.bids[i].r) {
                            this.bids[i] = bid;
                            break;
                        }
                        else if (bid.r > this.bids[i].r) {
                            this.bids.splice(i, 0, bid);
                            break;
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
                    for (let i = 0; i < this.asks.length; i++) {
                        if (!this.asks[i]) {
                            console.error(`invalid condition this.asks`, this.asks);
                        }
                        if (ask.a === 0 && ask.r === this.asks[i].r) {
                            // need to delete this entry.
                            this.asks.splice(i, 1);
                            break;
                        }
                        else if (ask.r == this.asks[i].r) {
                            this.asks[i] = ask;
                            break;
                        }
                        else if (ask.r < this.asks[i].r) {
                            this.asks.splice(i, 0, ask);
                            break;
                        }
                    }
                }
            }
        }
    }
    getOb(depth) {
        return { asks: depth ? this.asks.slice(0, 25) : this.asks, bids: depth ? this.bids.slice(0, 25) : this.bids };
    }
}
exports.GenericObKeeperShared = GenericObKeeperShared;
