import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
export interface ObRes {
    bids: number[][];
    asks: number[][];
}
export interface ObWsData {
    book: ObRes;
    depth: number;
    sequence: number;
    symbol: string;
    timestamp: number;
    type: 'incremental' | 'snapshot';
}
export declare function phemexToStandardOb(v: number[]): OrderBookItem;
export declare class PhemexObKeeper extends GenericObKeeper {
    onSocketMessage(msg: any): void;
}
