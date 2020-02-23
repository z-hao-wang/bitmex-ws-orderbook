"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function sortedFindIndex(arr, val, getter) {
    // default callback for primitive arrays
    let deli = arr.length - 1, // delta index
    base = 0; // base to add the delta index
    while (deli > 0 && getter(arr[base + deli]) !== val) {
        deli = ~~(deli / 2);
        getter(arr[base + deli]) < val && (base += deli);
    }
    return getter(arr[base + deli]) === val ? base + deli : -1;
}
exports.sortedFindIndex = sortedFindIndex;
