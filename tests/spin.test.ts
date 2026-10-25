import { describe, expect, it } from 'vitest';
import { mod, easeOutQuint, targetRotation, turnsForDuration, winnerIndexAtRotation } from '../src/lib/spin';

describe('spin landing', () => {
  it('stops with the chosen segment centered under the pointer', () => {
    const currents = [0, 0.4, Math.PI, -2, 20];
    const counts = [1, 2, 3, 5, 8, 17, 64];
    for (const count of counts) {
      for (let winner = 0; winner < count; winner += 1) {
        for (const current of currents) {
          const turns = 4.5;
          const target = targetRotation(current, winner, count, turns);
          const slice = (Math.PI * 2) / count;
          const pointed = mod(-target, Math.PI * 2);
          expect(target).toBeGreaterThanOrEqual(current + turns * Math.PI * 2 - 1e-9);
          expect(winnerIndexAtRotation(target, count)).toBe(winner);
          expect(Math.abs(pointed - (winner + 0.5) * slice)).toBeLessThan(1e-8);
        }
      }
    }
  });

  it('eases from 0 to 1 and only slows down', () => {
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
    let previous = -1;
    let previousSpeed = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 20; step += 1) {
      const value = easeOutQuint(step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      const speed = value - previous;
      expect(speed).toBeLessThanOrEqual(previousSpeed + 1e-12);
      previous = value;
      previousSpeed = speed;
    }
  });

  it('maps a longer duration to more turns, inside the allowed range', () => {
    expect(turnsForDuration(2000)).toBeLessThan(turnsForDuration(8000));
    expect(turnsForDuration(100)).toBe(turnsForDuration(2000));
    expect(turnsForDuration(99_000)).toBe(turnsForDuration(12_000));
  });
});
