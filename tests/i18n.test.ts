import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import { translate } from '../src/i18n';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, nested]) =>
    keys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translations', () => {
  it('keeps French and English on the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('uses the shared footer credit and interpolates counts', () => {
    expect(fr.footer.credit).toBe('Un outil Dynamogic / A Dynamogic tool');
    expect(en.footer.credit).toBe('Un outil Dynamogic / A Dynamogic tool');
    expect(translate('fr', 'names.countMany', { count: 12 })).toBe('12 noms');
    expect(translate('en', 'names.countOne', { count: 1 })).toBe('1 name');
  });
});
