import type { DrawRecord } from './history';

function csvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function historyToCsv(entries: readonly DrawRecord[]): string {
  const lines = ['name,drawn_at'];
  for (const entry of entries) {
    lines.push(`${csvCell(entry.name)},${csvCell(entry.at)}`);
  }
  return `${lines.join('\r\n')}\r\n`;
}
