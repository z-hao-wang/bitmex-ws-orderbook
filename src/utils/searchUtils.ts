export function sortedFindIndex(arr: any[], val: number, getter: (v: any) => any) {
  // default callback for primitive arrays
  let deli = arr.length - 1, // delta index
    base = 0; // base to add the delta index
  while (deli > 0 && getter(arr[base + deli]) !== val) {
    deli = ~~(deli / 2);
    getter(arr[base + deli]) < val && (base += deli);
  }
  return getter(arr[base + deli]) === val ? base + deli : -1;
}
