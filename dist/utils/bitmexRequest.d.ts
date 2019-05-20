import { BitmexOb } from '../types/bitmex.type';
export declare type Method = 'POST' | 'GET' | 'PUT' | 'DELETE';
export declare function bitmexRequest<T = any>(method: Method, path: string, data: any, retryTimes: number, testnet: boolean): Promise<T>;
export declare function pollOrderBook(pair: string, testnet: boolean): Promise<BitmexOb.OrderBookSchema>;
