export function isTimeWithinRange(lastTs: Date | undefined, rangeMs: number) {
  return lastTs && Date.now() - lastTs.getTime() < rangeMs;
}
