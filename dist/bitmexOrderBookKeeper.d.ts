import * as EventEmitter from 'events';
export declare function sortByAsc(items: any[], key?: string): any[];
export declare function sortByDesc(items: any[], key?: string): any[];
export declare namespace BitmexOrderBookKeeper {
    interface Options {
        testnet?: boolean;
        enableEvent?: boolean;
    }
}
export declare class BitmexOrderBookKeeper extends EventEmitter {
    protected lastObWsTime?: Date;
    protected storedObs: Record<string, Record<string, Bitmex.OBRow>>;
    protected testnet: boolean;
    protected enableEvent: boolean;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BitmexOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    protected _saveWsObData(obRows: Bitmex.BitmexOrderBookItem[], action: string): void;
    protected _getCurrentRealTimeOB(pair: string): Bitmex.OrderBookSchema | null;
    getOrderBook(pair: string, forcePoll?: boolean): Promise<Bitmex.OrderBookSchema>;
}
