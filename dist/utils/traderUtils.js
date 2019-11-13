"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isTimeWithinRange(lastTs, rangeMs) {
    return lastTs && Date.now() - lastTs.getTime() < rangeMs;
}
exports.isTimeWithinRange = isTimeWithinRange;
