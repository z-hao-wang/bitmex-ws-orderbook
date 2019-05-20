import * as request from 'request';
interface IRetryRequestOption {
    maxRetryTimes?: number;
    successCondition(res: any): boolean;
}
export declare function createRequest(options: request.Options, isJson?: boolean): () => Promise<{}>;
export declare function requestRetry(original: () => Promise<any>, options: IRetryRequestOption, retryTimes?: number, errors?: any[]): Promise<any>;
export {};
