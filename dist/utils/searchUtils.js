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
function sortedFindFirstGreater(arr, val, getter, allowEqual) {
    let start = 0;
    let end = arr.length - 1;
    let ans = -1;
    if (arr.length === 0) {
        return -1;
    }
    if (arr.length === 1) {
        return getter(arr[0]) > val ? 0 : -1;
    }
    // the array must be sorted ascending.
    if (getter(arr[start]) > getter(arr[end])) {
        throw new Error(`sortedFindFirstGreater requires data to be sorted ascending`);
    }
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        if (allowEqual && getter(arr[mid]) === val) {
            return mid;
        }
        // Move to right side if target is greater
        if (getter(arr[mid]) <= val)
            start = mid + 1;
        // Move left side.
        else {
            ans = mid;
            end = mid - 1;
        }
    }
    return ans;
}
exports.sortedFindFirstGreater = sortedFindFirstGreater;
function sortedFindFirstGreaterEqual(arr, val, getter) {
    return sortedFindFirstGreater(arr, val, getter, true);
}
exports.sortedFindFirstGreaterEqual = sortedFindFirstGreaterEqual;
function sortedFindFirstSmaller(arr, val, getter, allowEqual) {
    let start = 0;
    let end = arr.length - 1;
    let ans = -1;
    if (arr.length === 0) {
        return -1;
    }
    if (arr.length === 1) {
        return getter(arr[0]) < val ? 0 : -1;
    }
    // the array must be sorted descending.
    if (getter(arr[start]) < getter(arr[end])) {
        throw new Error(`sortedFindFirstGreater requires data to be sorted descending`);
    }
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        if (allowEqual && getter(arr[mid]) === val) {
            return mid;
        }
        // Move to right side if target is smaller
        if (getter(arr[mid]) >= val)
            start = mid + 1;
        // Move right side.
        else {
            ans = mid;
            end = mid - 1;
        }
    }
    return ans;
}
exports.sortedFindFirstSmaller = sortedFindFirstSmaller;
function sortedFindFirstSmallerEqual(arr, val, getter) {
    return sortedFindFirstSmaller(arr, val, getter, true);
}
exports.sortedFindFirstSmallerEqual = sortedFindFirstSmallerEqual;
