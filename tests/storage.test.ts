import { describe, expect, it } from 'vitest';
import { rememberDraw, HISTORY_LIMIT } from '../src/lib/history';
import { historyToCsv } from '../src/lib/csv';
import {
  loadState,
  parseState,
  saveState,
  upsertList,
  type KeyValueStore,
} from '../src/lib/storage';

function memoryStore(initial = ''): KeyValueStore & { snapshot: () => string } {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    removeItem: () => {
      value = '';
    },
    snapshot: () => value,
  };
}

describe('history and csv', () => {
  it('keeps the latest 20 draws', () => {
    let history: { name: string; at: string }[] = [];
    for (let index = 0; index < 25; index += 1) {
      history = rememberDraw(history, `Name ${index}`, `2026-10-25T12:${String(index).padStart(2, '0')}:00.000Z`);
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]?.name).toBe('Name 24');
    expect(history[19]?.name).toBe('Name 5');
  });

  it('escapes quotes, commas, and formula prefixes', () => {
    const csv = historyToCsv([
      { name: 'Ada, "Lovelace"', at: '2026-10-25T12:00:00.000Z' },
      { name: '=2+2', at: '2026-10-25T12:01:00.000Z' },
    ]);
    expect(csv.startsWith('name,drawn_at\r\n')).toBe(true);
    expect(csv).toContain('"Ada, ""Lovelace"""');
    expect(csv).toContain("'=2+2");
  });
});

describe('storage', () => {
  it('round-trips state and ignores a broken store', () => {
    const store = memoryStore();
    const state = parseState({
      settings: { theme: 'dark', lang: 'en', sound: true, removeWinner: true, durationMs: 4500 },
      names: [' Ada ', ''],
      lists: [{ id: 'abc', name: 'Classe', names: ['Ada', 'Grace'] }],
      history: [{ name: 'Ada', at: '2026-10-25T12:00:00.000Z' }],
    });
    expect(state.names).toEqual(['Ada']);
    expect(state.settings.durationMs).toBe(5000);
    expect(state.settings.lang).toBe('en');
    saveState(store, state);
    expect(loadState(store)).toEqual(state);

    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadState(broken).names).toEqual([]);
    expect(() => saveState(broken, state)).not.toThrow();
  });

  it('drops corrupt JSON and updates a list with the same name', () => {
    const store = memoryStore('{');
    expect(loadState(store).settings.lang).toBe('fr');
    const lists = upsertList(
      [{ id: '1', name: 'Classe', names: ['Ada'] }],
      { id: '2', name: 'classe', names: ['Grace'] },
    );
    expect(lists).toEqual([{ id: '1', name: 'classe', names: ['Grace'] }]);
  });
});
