"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const DEFAULT_RETRY_TIMES = 3;
function pause(dur = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((r) => {
            setTimeout(r, dur);
        });
    });
}
function safeToString(obj) {
    try {
        if (obj instanceof Error) {
            return obj.toString();
        }
        return JSON.stringify(obj);
    }
    catch (e) {
        return obj;
    }
}
// create request and return an async function.
function createRequest(options, isJson = true) {
    return () => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            request(options, (err, _response, body) => {
                if (err) {
                    return reject(err);
                }
                try {
                    const bodyParsed = isJson ? JSON.parse(body) : body;
                    resolve(bodyParsed);
                }
                catch (err) {
                    reject(new Error(`invalid JSON: ${body}`));
                }
            });
        });
    });
}
exports.createRequest = createRequest;
function requestRetry(original, options, retryTimes = 0, errors = []) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxRetryTimes = options.maxRetryTimes || DEFAULT_RETRY_TIMES;
        if (retryTimes >= maxRetryTimes) {
            throw new Error(errors.map(safeToString).join(','));
        }
        if (retryTimes > 0) {
            // can ajust wait time between calls
            yield pause(retryTimes * 1000);
        }
        try {
            const res = yield original();
            if (options.successCondition(res)) {
                return res;
            }
            else {
                return requestRetry(original, options, retryTimes + 1, [...errors, res]);
            }
        }
        catch (e) {
            return requestRetry(original, options, retryTimes + 1, [...errors, e]);
        }
    });
}
exports.requestRetry = requestRetry;
