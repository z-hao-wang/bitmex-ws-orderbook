import { BybitRequest } from 'bitmex-request';
import { BybitOb } from './types/bybit.type';
import { OrderBookSchema } from 'bitmex-request';
import { BaseKeeper } from './baseKeeper';
export declare namespace BybitOrderBookKeeper {
    interface Options extends BaseKeeper.Options {
        testnet?: boolean;
    }
}
export declare class BybitOrderBookKeeper extends BaseKeeper {
    protected lastObWsTime?: Date;
    protected storedObs: Record<string, Record<string, BybitOb.OBRow>>;
    protected testnet: boolean;
    protected bybitRequest: BybitRequest;
    name: string;
    VERIFY_OB_PERCENT: number;
    VALID_OB_WS_GAP: number;
    constructor(options: BybitOrderBookKeeper.Options);
    onSocketMessage(msg: any): void;
    protected _saveWsObData(obs: BybitOb.OrderBooks): void;
    getOrderBookWs(pair: string): OrderBookSchema | null;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema>;
}
