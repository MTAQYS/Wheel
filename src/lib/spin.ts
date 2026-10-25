/**
 * Angle convention shared by the animator and the canvas.
 *
 * Rotation 0 puts the start of segment 0 at the top pointer.
 * Positive rotation turns the wheel clockwise.
 * Segment i covers the half-open local arc [i, i+1) × slice,
 * measured clockwise from the top. After a clockwise rotation R,
 * the local angle sitting under the pointer is (−R) mod 2π.
 * The wheel stops with the chosen segment's center on the pointer.
 */

export function mod(value: number, modulus: number): number {
  if (!(modulus > 0) || !Number.isFinite(modulus)) {
    throw new RangeError('modulus must be a positive finite number');
  }
  return ((value % modulus) + modulus) % modulus;
}

export function winnerIndexAtRotation(rotation: number, count: number): number {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError('count must be a positive integer');
  }
  if (!Number.isFinite(rotation)) {
    throw new RangeError('rotation must be finite');
  }
  const slice = (Math.PI * 2) / count;
  const pointed = mod(-rotation, Math.PI * 2);
  const index = Math.floor(pointed / slice + 1e-10);
  if (index >= count) return count - 1;
  if (index < 0) return 0;
  return index;
}

export function targetRotation(
  current: number,
  winner: number,
  count: number,
  turns: number,
): number {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError('count must be a positive integer');
  }
  if (!Number.isInteger(winner) || winner < 0 || winner >= count) {
    throw new RangeError('winner is outside the wheel');
  }
  if (!Number.isFinite(current) || !Number.isFinite(turns)) {
    throw new RangeError('rotation and turns must be finite');
  }
  const slice = (Math.PI * 2) / count;
  const finalMod = mod(-(winner + 0.5) * slice, Math.PI * 2);
  const base = current + Math.max(0, turns) * Math.PI * 2;
  return base + mod(finalMod - mod(base, Math.PI * 2), Math.PI * 2);
}

/** Fast at first, then a long settle. The end position is exact. */
export function easeOutQuint(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 5;
}

export function turnsForDuration(durationMs: number): number {
  const seconds = Math.min(12, Math.max(2, durationMs / 1000));
  return 2 + seconds * 0.75;
}
