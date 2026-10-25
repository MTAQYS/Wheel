const UINT32_RANGE = 0x1_0000_0000;

export type Uint32Source = () => number;

function cryptoUint32(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const value = buffer[0];
  if (value === undefined) {
    throw new Error('crypto.getRandomValues returned no data');
  }
  return value;
}

function readUint32(next: Uint32Source): number {
  const value = next();
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('random source must return a uint32');
  }
  return value;
}

/**
 * Uniform integer in [0, count). Rejection sampling drops the incomplete
 * residue class of 2^32, so the result is not biased by a modulo.
 * The default source is crypto.getRandomValues, not the floating-point PRNG.
 */
export function randomIndex(count: number, next: Uint32Source = cryptoUint32): number {
  if (!Number.isInteger(count) || count <= 0 || count > UINT32_RANGE) {
    throw new RangeError('count must be an integer from 1 to 2^32');
  }
  const limit = Math.floor(UINT32_RANGE / count) * count;
  let value = readUint32(next);
  let rejected = 0;
  while (value >= limit) {
    rejected += 1;
    if (rejected > 64) {
      throw new Error('random source kept returning rejected values');
    }
    value = readUint32(next);
  }
  return value % count;
}

export function shuffle<T>(items: readonly T[], next?: Uint32Source): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, next);
    const current = copy[index];
    const swap = copy[swapIndex];
    if (current === undefined || swap === undefined) continue;
    copy[index] = swap;
    copy[swapIndex] = current;
  }
  return copy;
}
