import { describe, expect, it } from 'vitest';
import { segmentColorIndices } from '../src/lib/colors';

describe('segment colors', () => {
  it('keeps neighbors, including the closing pair, distinct', () => {
    for (let count = 2; count <= 40; count += 1) {
      const colors = segmentColorIndices(count, 3);
      expect(colors).toHaveLength(count);
      for (let index = 0; index < count; index += 1) {
        const next = colors[(index + 1) % count];
        expect(colors[index]).not.toBe(next);
      }
    }
  });

  it('uses one color when the wheel has a single name', () => {
    expect(segmentColorIndices(1, 3)).toEqual([0]);
    expect(segmentColorIndices(0, 3)).toEqual([]);
  });
});
