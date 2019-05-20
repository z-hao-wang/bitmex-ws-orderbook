import * as request from 'request';
import { requestRetry } from './retry';
export type Method = 'POST' | 'GET' | 'PUT' | 'DELETE';

const API_VERSION = '/api/v1';
const URL_TESTNET = 'https://testnet.bitmex.com' + API_VERSION;
const URL_PROD = 'https://www.bitmex.com' + API_VERSION;

export function getUrl(testnet: boolean) {
  return testnet ? URL_TESTNET : URL_PROD;
}

export async function bitmexRequest<T = any>(
  method: Method,
  path: string,
  data: any,
  retryTimes: number,
  testnet: boolean,
): Promise<T> {
  const postBody = JSON.stringify(data);
  let headers: any = {
    'content-type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const fullUrl = getUrl(testnet) + path;
  const requestOptions = {
    headers: headers,
    url: fullUrl,
    method,
    body: postBody,
  };
  const requestFunc = async () => {
    return new Promise<T>((resolve, reject) => {
      request(requestOptions, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        if (!body) {
          const errMsg = `empty result, ${method} ${path} ${data}`;
          return reject(errMsg);
        }
        try {
          const parsedBody = JSON.parse(body);
          resolve(parsedBody);
        } catch (e) {
          const errMsg = `parse body json failed, ${method} ${path} ${body}`;
          reject(errMsg);
        }
      });
    });
  };
  return requestRetry(requestFunc, {
    maxRetryTimes: retryTimes,
    successCondition: (res: any) => {
      return res && !res.error;
    },
  });
}
