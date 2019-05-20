"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isTimeWithinRange(lastTs, rangeMs) {
    return lastTs && new Date().getTime() - lastTs.getTime() < rangeMs;
}
exports.isTimeWithinRange = isTimeWithinRange;
