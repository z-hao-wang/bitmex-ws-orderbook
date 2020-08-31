import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
export interface ObStream {
    e: string;
    E: number;
    T: number;
    s: string;
    U: number;
    u: number;
    pu: number;
    b: string[][];
    a: string[][];
}
export declare function binanceObToStandardOb(v: (number | string)[]): OrderBookItem;
export declare class BinanceFxObKeeper extends GenericObKeeper {
    onSocketMessage(msg: any, pairDb?: string): void;
}
