import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, MAX_NAMES, parseCsv, parseImport, parseNameList } from '../src/lib/parse';

describe('parseNameList', () => {
  it('trims names and drops empty lines', () => {
    const parsed = parseNameList('  Ada \r\n\nGrace\r\n   \nLin  ');
    expect(parsed.names).toEqual(['Ada', 'Grace', 'Lin']);
    expect(parsed.truncated).toBe(0);
    expect(parsed.overflow).toBe(0);
  });

  it('keeps commas inside a typed name', () => {
    expect(parseNameList('Smith, John\nAda').names).toEqual(['Smith, John', 'Ada']);
  });

  it('shortens names past 100 characters and caps the list at 500', () => {
    const long = `A${'b'.repeat(120)}`;
    const lines = [long, ...Array.from({ length: 510 }, (_item, index) => `Name ${index}`)];
    const parsed = parseNameList(lines.join('\n'));
    expect(parsed.names).toHaveLength(MAX_NAMES);
    expect(parsed.names[0]).toHaveLength(MAX_NAME_LENGTH);
    expect(parsed.truncated).toBe(1);
    expect(parsed.overflow).toBe(lines.length - MAX_NAMES);
  });

  it('strips control characters', () => {
    expect(parseNameList('Ada\u0007 Lovelace').names).toEqual(['Ada Lovelace']);
  });

  it('ignores a leading BOM', () => {
    expect(parseNameList('\uFEFFAda\nGrace').names).toEqual(['Ada', 'Grace']);
  });
});

describe('parseCsv', () => {
  it('reads a header and a single column', () => {
    const parsed = parseCsv('nom\nAda\n"Smith, John"\n');
    expect(parsed.names).toEqual(['Ada', 'Smith, John']);
  });

  it('reads one row of comma-separated names', () => {
    expect(parseCsv('Ada,Grace,Lin').names).toEqual(['Ada', 'Grace', 'Lin']);
  });

  it('reads a semicolon file and keeps the first column when there are several', () => {
    const parsed = parseCsv('nom;courriel\nAda;ada@example.com\nGrace;grace@example.com\n');
    expect(parsed.names).toEqual(['Ada', 'Grace']);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('"Ada ""A"" Lovelace"').names).toEqual(['Ada "A" Lovelace']);
  });
});

describe('parseImport', () => {
  it('treats txt as one name per line and csv as a table', () => {
    expect(parseImport('classe.txt', 'Smith, John').names).toEqual(['Smith, John']);
    expect(parseImport('classe.csv', 'Ada,Grace').names).toEqual(['Ada', 'Grace']);
  });
});
