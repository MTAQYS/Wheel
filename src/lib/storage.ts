import { rememberDraw, HISTORY_LIMIT, type DrawRecord } from './history';
import { isLang, type Lang } from '../i18n';
import { MAX_NAME_LENGTH, normalizeNames } from './parse';

/** Keep in sync with public/theme-init.js. */
export const STORAGE_KEY = 'wheel.v1';

export const MIN_DURATION_MS = 2000;
export const MAX_DURATION_MS = 12000;
export const DEFAULT_DURATION_MS = 6000;
const MAX_LISTS = 30;
const MAX_LIST_NAME = 80;

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface SavedList {
  id: string;
  name: string;
  names: string[];
}

export interface Settings {
  theme: ThemeChoice;
  lang: Lang;
  sound: boolean;
  removeWinner: boolean;
  durationMs: number;
}

export interface AppState {
  settings: Settings;
  names: string[];
  lists: SavedList[];
  history: DrawRecord[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    lang: 'fr',
    sound: false,
    removeWinner: false,
    durationMs: DEFAULT_DURATION_MS,
  };
}

export function defaultState(): AppState {
  return {
    settings: defaultSettings(),
    names: [],
    lists: [],
    history: [],
  };
}

export function browserStore(): KeyValueStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__wheel_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function clampDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DURATION_MS;
  const snapped = Math.round(value / 1000) * 1000;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, snapped));
}

function isTheme(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system';
}

function parseHistory(value: unknown): DrawRecord[] {
  if (!Array.isArray(value)) return [];
  const records: DrawRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { name?: unknown; at?: unknown };
    if (typeof record.name !== 'string' || typeof record.at !== 'string') continue;
    const name = record.name.trim().slice(0, MAX_NAME_LENGTH);
    if (!name || Number.isNaN(Date.parse(record.at))) continue;
    records.push({ name, at: record.at });
  }
  return records.slice(0, HISTORY_LIMIT);
}

function parseLists(value: unknown): SavedList[] {
  if (!Array.isArray(value)) return [];
  const lists: SavedList[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { id?: unknown; name?: unknown; names?: unknown };
    if (typeof record.name !== 'string') continue;
    const name = record.name.trim().slice(0, MAX_LIST_NAME);
    if (!name) continue;
    const names = Array.isArray(record.names)
      ? normalizeNames(record.names.filter((entry): entry is string => typeof entry === 'string')).names
      : [];
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : createId();
    lists.push({ id, name, names });
    if (lists.length >= MAX_LISTS) break;
  }
  return lists;
}

export function parseState(value: unknown): AppState {
  const defaults = defaultState();
  if (!value || typeof value !== 'object') return defaults;
  const raw = value as {
    settings?: unknown;
    names?: unknown;
    lists?: unknown;
    history?: unknown;
  };
  const settingsRecord =
    raw.settings && typeof raw.settings === 'object'
      ? (raw.settings as Record<string, unknown>)
      : {};
  const names = Array.isArray(raw.names)
    ? normalizeNames(raw.names.filter((entry): entry is string => typeof entry === 'string')).names
    : [];
  return {
    settings: {
      theme: isTheme(settingsRecord.theme) ? settingsRecord.theme : defaults.settings.theme,
      lang: isLang(settingsRecord.lang) ? settingsRecord.lang : defaults.settings.lang,
      sound: settingsRecord.sound === true,
      removeWinner: settingsRecord.removeWinner === true,
      durationMs: clampDuration(settingsRecord.durationMs),
    },
    names,
    lists: parseLists(raw.lists),
    history: parseHistory(raw.history),
  };
}

export function loadState(store: KeyValueStore | null): AppState {
  if (!store) return defaultState();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return parseState(JSON.parse(raw) as unknown);
  } catch {
    return defaultState();
  }
}

export function saveState(store: KeyValueStore | null, state: AppState): void {
  if (!store) return;
  try {
    const payload = {
      version: 1,
      settings: state.settings,
      names: state.names,
      lists: state.lists.slice(0, MAX_LISTS),
      history: state.history.slice(0, HISTORY_LIMIT),
    };
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* Private mode, quota, or disabled storage. */
  }
}

export function createId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function upsertList(lists: readonly SavedList[], list: SavedList): SavedList[] {
  const existing = lists.findIndex(
    (item) => item.id === list.id || item.name.toLowerCase() === list.name.toLowerCase(),
  );
  if (existing === -1) return [list, ...lists].slice(0, MAX_LISTS);
  const next = lists.slice();
  const previous = next[existing];
  next[existing] = { ...list, id: previous?.id ?? list.id };
  return next;
}

export function remember(state: AppState, name: string, at: string): AppState {
  return { ...state, history: rememberDraw(state.history, name, at) };
}
