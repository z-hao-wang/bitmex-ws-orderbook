export function isTimeWithinRange(lastTs: Date | undefined, rangeMs: number) {
  return lastTs && new Date().getTime() - lastTs.getTime() < rangeMs;
}
