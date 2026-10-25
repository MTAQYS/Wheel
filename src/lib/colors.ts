/** Neighboring wedges, including the first and the last, get different colors. */
export function segmentColorIndices(count: number, paletteSize: number): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('count must be a non-negative integer');
  }
  if (!Number.isInteger(paletteSize) || paletteSize <= 0) {
    throw new RangeError('paletteSize must be a positive integer');
  }
  if (count === 0) return [];
  if (count === 1 || paletteSize === 1) return Array.from({ length: count }, () => 0);

  const indices: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const previous = index === 0 ? -1 : (indices[index - 1] ?? -1);
    const bannedFirst = index === count - 1 ? (indices[0] ?? -1) : -1;
    let chosen = -1;
    for (let color = 0; color < paletteSize; color += 1) {
      if (color !== previous && color !== bannedFirst) {
        chosen = color;
        break;
      }
    }
    if (chosen < 0) chosen = (previous + 1) % paletteSize;
    indices.push(chosen);
  }
  return indices;
}
