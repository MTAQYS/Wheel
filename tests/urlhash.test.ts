import { describe, expect, it } from 'vitest';
import { MAX_NAMES } from '../src/lib/parse';
import { decodeNamesHash, encodeNamesHash } from '../src/lib/urlhash';

describe('url hash', () => {
  it('round-trips unicode, punctuation, and markup-looking names', () => {
    const names = ['José', 'Müller', "O'Brien", '名前', '<script>alert(1)</script>', 'a"b'];
    const hash = encodeNamesHash(names);
    expect(hash.startsWith('#n=')).toBe(true);
    expect(hash.includes('José')).toBe(false);
    expect(decodeNamesHash(hash)).toEqual(names);
    expect(decodeNamesHash(hash.slice(1))).toEqual(names);
  });

  it('round-trips an empty list as an explicit payload', () => {
    const hash = encodeNamesHash([]);
    expect(decodeNamesHash(hash)).toEqual([]);
  });

  it('returns null for missing, empty, or corrupt payloads', () => {
    expect(decodeNamesHash('')).toBeNull();
    expect(decodeNamesHash('#')).toBeNull();
    expect(decodeNamesHash('#lang=fr')).toBeNull();
    expect(decodeNamesHash('#n=')).toBeNull();
    expect(decodeNamesHash('#n=!!!!')).toBeNull();
    expect(decodeNamesHash(`#n=${encodeNamesHash(['ok']).slice(3)}xyz`)).toBeNull();
  });

  it('rejects payloads that are not a list of strings', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ names: ['Ada'] }));
    const payload = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    expect(decodeNamesHash(`#n=${payload}`)).toBeNull();
  });

  it('clamps decoded lists to the same limits as typed input', () => {
    const names = Array.from({ length: MAX_NAMES + 10 }, (_item, index) => {
      const suffix = String(index);
      return `${'n'.repeat(150)}${suffix}`;
    });
    const decoded = decodeNamesHash(encodeNamesHash(names));
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveLength(MAX_NAMES);
    expect(decoded?.[0]).toHaveLength(100);
  });
});
