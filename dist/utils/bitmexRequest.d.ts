export declare type Method = 'POST' | 'GET' | 'PUT' | 'DELETE';
export declare function getUrl(testnet: boolean): string;
export declare function bitmexRequest<T = any>(method: Method, path: string, data: any, retryTimes: number, testnet: boolean): Promise<T>;
export declare function pollOrderBook(pair: string, testnet: boolean): Promise<Bitmex.OrderBookSchema>;
