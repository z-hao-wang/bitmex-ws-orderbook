import * as request from 'request';

interface IRetryRequestOption {
  maxRetryTimes?: number;
  successCondition(res: any): boolean;
}
const DEFAULT_RETRY_TIMES = 3;

async function pause(dur: number = 0) {
  return new Promise((r: any) => {
    setTimeout(r, dur);
  });
}

function safeToString(obj: any) {
  try {
    if (obj instanceof Error) {
      return obj.toString();
    }

    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
}

// create request and return an async function.
export function createRequest(options: request.Options, isJson: boolean = true) {
  return async () => {
    return new Promise((resolve: any, reject: any) => {
      request(options, (err: any, _response: any, body: any) => {
        if (err) {
          return reject(err);
        }
        try {
          const bodyParsed = isJson ? JSON.parse(body) : body;
          resolve(bodyParsed);
        } catch (err) {
          reject(new Error(`invalid JSON: ${body}`));
        }
      });
    });
  };
}

export async function requestRetry(
  original: () => Promise<any>,
  options: IRetryRequestOption,
  retryTimes: number = 0,
  errors: any[] = [],
): Promise<any> {
  const maxRetryTimes = options.maxRetryTimes || DEFAULT_RETRY_TIMES;
  if (retryTimes >= maxRetryTimes) {
    throw new Error(errors.map(safeToString).join(','));
  }
  if (retryTimes > 0) {
    // can ajust wait time between calls
    await pause(retryTimes * 1000);
  }
  try {
    const res = await original();
    if (options.successCondition(res)) {
      return res;
    } else {
      return requestRetry(original, options, retryTimes + 1, [...errors, res]);
    }
  } catch (e) {
    return requestRetry(original, options, retryTimes + 1, [...errors, e]);
  }
}
