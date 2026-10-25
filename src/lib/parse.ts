export const MAX_NAMES = 500;
export const MAX_NAME_LENGTH = 100;
const MAX_FILE_BYTES = 1_000_000;

export interface ParsedList {
  names: string[];
  truncated: number;
  overflow: number;
}

const HEADER = /^(name|names|nom|noms)$/i;

export function maxFileBytes(): number {
  return MAX_FILE_BYTES;
}

function isControl(code: number): boolean {
  return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
}

function clean(raw: string): string {
  let result = '';
  for (const char of raw) {
    if (!isControl(char.charCodeAt(0))) result += char;
  }
  return result.trim();
}

export function normalizeNames(raw: readonly string[]): ParsedList {
  const names: string[] = [];
  let truncated = 0;
  let overflow = 0;
  for (const item of raw) {
    let name = clean(item);
    if (!name) continue;
    if (name.length > MAX_NAME_LENGTH) {
      name = name.slice(0, MAX_NAME_LENGTH);
      truncated += 1;
    }
    if (names.length >= MAX_NAMES) {
      overflow += 1;
      continue;
    }
    names.push(name);
  }
  return { names, truncated, overflow };
}

/** One name per line. Commas stay inside the name. */
export function parseNameList(text: string): ParsedList {
  return normalizeNames(text.replace(/^\uFEFF/, '').split(/\r?\n/));
}

export function parseCsvRows(text: string, delimiter: ',' | ';' = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? '';
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') continue;
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function detectDelimiter(text: string): ',' | ';' {
  const sample = text.slice(0, 4000);
  const commas = sample.split(',').length - 1;
  const semis = sample.split(';').length - 1;
  return semis > commas ? ';' : ',';
}

function cellsFromCsv(text: string): string[] {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvRows(text, delimiter).filter((row) => row.some((cell) => clean(cell)));
  if (rows.length === 0) return [];
  const multiColumn = rows.some((row) => row.length > 1);
  const multiRow = rows.length > 1;
  if (multiColumn && multiRow) {
    let column = rows.map((row) => row[0] ?? '');
    if (HEADER.test(clean(column[0] ?? ''))) column = column.slice(1);
    return column;
  }
  let flat = rows.flat();
  if (multiRow && HEADER.test(clean(flat[0] ?? ''))) flat = flat.slice(1);
  return flat;
}

export function parseCsv(text: string): ParsedList {
  return normalizeNames(cellsFromCsv(text));
}

export function parseImport(filename: string, text: string): ParsedList {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsv(text);
  return parseNameList(text);
}
