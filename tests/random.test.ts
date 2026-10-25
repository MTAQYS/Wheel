import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { randomIndex, shuffle } from '../src/lib/random';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

function chiSquare(counts: number[]): number {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const expected = total / counts.length;
  return counts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
}

describe('randomIndex', () => {
  it('never calls Math.random anywhere in the app source', () => {
    const root = new URL('../src', import.meta.url);
    const offenders = walk(root.pathname).filter((file) =>
      /Math\.random\s*\(/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('rejects values in the incomplete residue class', () => {
    const count = 10;
    const limit = Math.floor(2 ** 32 / count) * count;
    const draws = [limit, 0xffffffff, 42];
    let index = 0;
    const result = randomIndex(count, () => {
      const value = draws[index];
      index += 1;
      if (value === undefined) throw new Error('source exhausted');
      return value;
    });
    expect(result).toBe(2);
    expect(index).toBe(3);
  });

  it('returns 0 for a single choice', () => {
    expect(randomIndex(1, () => 0xffffffff)).toBe(0);
  });

  it('rejects an empty wheel', () => {
    expect(() => randomIndex(0)).toThrow(RangeError);
    expect(() => randomIndex(1.5)).toThrow(RangeError);
  });

  it('stays inside the requested range', () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const value = randomIndex(500);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(500);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('is close to uniform for awkward moduli', () => {
    const cases = [
      { count: 3, trials: 12000, limit: 25 },
      { count: 7, trials: 14000, limit: 35 },
    ];
    for (const { count, trials, limit } of cases) {
      const counts = Array.from({ length: count }, () => 0);
      for (let trial = 0; trial < trials; trial += 1) {
        const bucket = randomIndex(count);
        counts[bucket] = (counts[bucket] ?? 0) + 1;
      }
      expect(counts.every((value) => value > 0)).toBe(true);
      expect(chiSquare(counts)).toBeLessThan(limit);
    }
  });
});

describe('shuffle', () => {
  it('keeps the same names', () => {
    const names = ['Ada', 'Grace', 'Lin', 'Edsger'];
    const shuffled = shuffle(names);
    expect(shuffled.slice().sort()).toEqual(names.slice().sort());
    expect(names).toEqual(['Ada', 'Grace', 'Lin', 'Edsger']);
  });
});
