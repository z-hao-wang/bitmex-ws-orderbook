import { OrderBookItem } from 'bitmex-request';
import { GenericObKeeper } from './genericObKeeper';
export declare namespace PhemexObKeeper {
    interface ObRes {
        bids: number[][];
        asks: number[][];
    }
    interface ObWsData {
        book: ObRes;
        depth: number;
        sequence: number;
        symbol: string;
        timestamp: number;
        type: 'incremental' | 'snapshot';
    }
}
export declare function phemexToStandardOb(v: number[]): OrderBookItem;
export declare class PhemexObKeeper extends GenericObKeeper {
    onSocketMessage(msg: any): void;
    onReceiveObRaw(params: {
        pair: string;
        book: PhemexObKeeper.ObRes;
    }): void;
}
