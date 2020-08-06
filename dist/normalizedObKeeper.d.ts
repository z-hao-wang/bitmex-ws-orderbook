import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
export interface ObStreamShared {
    c: number;
    pair?: string;
    b: number[][];
    a: number[][];
    ts: number;
    e: 's' | 'u';
}
export declare function normalizedObToStandardOb(v: number[]): OrderBookItem;
export declare class NormalizedObKeeper extends GenericObKeeper {
    onSocketMessage(msg: any): void;
}
