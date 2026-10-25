export const HISTORY_LIMIT = 20;

export interface DrawRecord {
  name: string;
  at: string;
}

export function rememberDraw(
  history: readonly DrawRecord[],
  name: string,
  at: string,
): DrawRecord[] {
  return [{ name, at }, ...history].slice(0, HISTORY_LIMIT);
}
