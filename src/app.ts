import { playTick, playWin, unlockAudio } from './lib/audio';
import { historyToCsv } from './lib/csv';
import { maxFileBytes, parseImport, parseNameList } from './lib/parse';
import { randomIndex, shuffle } from './lib/random';
import { turnsForDuration } from './lib/spin';
import {
  browserStore,
  createId,
  loadState,
  saveState,
  upsertList,
  type AppState,
  type KeyValueStore,
  type SavedList,
  type ThemeChoice,
} from './lib/storage';
import { rememberDraw } from './lib/history';
import { decodeNamesHash, encodeNamesHash } from './lib/urlhash';
import { socialMeta, translate, type Lang } from './i18n';
import { DYNAMOGIC_URL } from './site';
import { readPalette, WheelView } from './lib/wheel';

interface Ui {
  root: HTMLElement;
  title: HTMLElement;
  tagline: HTMLElement;
  langGroup: HTMLElement;
  langButtons: HTMLButtonElement[];
  themeButton: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  winner: HTMLParagraphElement;
  liveWinner: HTMLParagraphElement;
  spinButton: HTMLButtonElement;
  spinHint: HTMLElement;
  presentButton: HTMLButtonElement;
  namesLabel: HTMLElement;
  count: HTMLElement;
  textarea: HTMLTextAreaElement;
  hint: HTMLElement;
  warnings: HTMLElement;
  importButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  clearButton: HTMLButtonElement;
  optionsTitle: HTMLElement;
  removeInput: HTMLInputElement;
  removeLabel: HTMLElement;
  durationLabel: HTMLElement;
  durationOutput: HTMLOutputElement;
  durationInput: HTMLInputElement;
  shuffleButton: HTMLButtonElement;
  soundInput: HTMLInputElement;
  soundLabel: HTMLElement;
  listsTitle: HTMLElement;
  listName: HTMLInputElement;
  saveButton: HTMLButtonElement;
  listSelect: HTMLSelectElement;
  loadButton: HTMLButtonElement;
  deleteButton: HTMLButtonElement;
  shareButton: HTMLButtonElement;
  historyTitle: HTMLElement;
  historyList: HTMLUListElement;
  exportButton: HTMLButtonElement;
  status: HTMLParagraphElement;
  footerLink: HTMLAnchorElement;
  footerCredit: HTMLElement;
  stageLabel: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function buildUi(root: HTMLElement): Ui {
  const page = el('div', { class: 'page' });
  const mast = el('header', { class: 'mast' });
  const mastText = el('div');
  const title = el('h1', { 'data-i18n': 'header.title' });
  const tagline = el('p', { class: 'tagline', 'data-i18n': 'header.tagline' });
  mastText.append(title, tagline);

  const tools = el('div', { class: 'mast-tools' });
  const langGroup = el('div', { class: 'seg', role: 'group' });
  const langFr = el('button', { type: 'button', 'data-lang': 'fr' });
  const langEn = el('button', { type: 'button', 'data-lang': 'en' });
  langGroup.append(langFr, langEn);
  const themeButton = el('button', { type: 'button', class: 'quiet', id: 'theme' });
  tools.append(langGroup, themeButton);
  mast.append(mastText, tools);

  const layout = el('main', { class: 'layout' });
  const stage = el('section', { class: 'stage' });
  const stageLabel = el('h2', { class: 'sr-only', id: 'stage-label', 'data-i18n': 'spin.winnerLabel' });
  stage.setAttribute('aria-labelledby', 'stage-label');
  const wheelWrap = el('div', { class: 'wheel-wrap' });
  const canvas = el('canvas', { id: 'wheel', width: '640', height: '640' });
  canvas.setAttribute('aria-hidden', 'true');
  wheelWrap.append(canvas);
  const winner = el('p', { class: 'winner', id: 'winner' });
  const spinHint = el('p', { class: 'sr-only', id: 'spin-hint' });
  const actions = el('div', { class: 'stage-actions' });
  const spinButton = el('button', {
    type: 'button',
    class: 'primary',
    id: 'spin',
    'aria-describedby': 'spin-hint',
  });
  const presentButton = el('button', { type: 'button', class: 'ghost', id: 'present' });
  actions.append(spinButton, presentButton);
  stage.append(stageLabel, wheelWrap, winner, actions);

  const panel = el('div', { class: 'panel', id: 'panel' });
  const namesBlock = el('section', { class: 'block' });
  const labelRow = el('div', { class: 'label-row' });
  const namesLabel = el('h2', { id: 'names-label' });
  const count = el('p', { class: 'count', id: 'count' });
  labelRow.append(namesLabel, count);
  const textarea = el('textarea', { id: 'names', spellcheck: 'false', autocomplete: 'off' });
  textarea.setAttribute('aria-labelledby', 'names-label');
  const hint = el('p', { class: 'hint' });
  const warnings = el('div', { class: 'note', id: 'warnings', 'aria-live': 'polite' });
  const nameRow = el('div', { class: 'row' });
  const importButton = el('button', { type: 'button', class: 'quiet', id: 'import' });
  const fileInput = el('input', {
    type: 'file',
    id: 'file',
    class: 'sr-only',
    accept: '.txt,.csv,text/plain,text/csv',
  });
  const clearButton = el('button', { type: 'button', class: 'quiet', id: 'clear' });
  nameRow.append(importButton, fileInput, clearButton);
  namesBlock.append(labelRow, textarea, hint, warnings, nameRow);

  const optionsBlock = el('section', { class: 'block' });
  const optionsTitle = el('h2');
  const removeLabel = el('label', { class: 'check' });
  const removeInput = el('input', { type: 'checkbox', id: 'remove-winner' });
  const removeText = el('span');
  removeLabel.append(removeInput, removeText);
  const durationWrap = el('label', { class: 'duration' });
  const durationHead = el('span');
  const durationLabel = el('span');
  const durationOutput = el('output', { for: 'duration', id: 'duration-value' });
  durationHead.append(durationLabel, durationOutput);
  const durationInput = el('input', {
    type: 'range',
    id: 'duration',
    min: '2',
    max: '12',
    step: '1',
  });
  durationWrap.append(durationHead, durationInput);
  const shuffleButton = el('button', { type: 'button', class: 'quiet', id: 'shuffle' });
  const soundLabel = el('label', { class: 'check' });
  const soundInput = el('input', { type: 'checkbox', id: 'sound' });
  const soundText = el('span');
  soundLabel.append(soundInput, soundText);
  optionsBlock.append(optionsTitle, removeLabel, durationWrap, shuffleButton, soundLabel);

  const listsBlock = el('section', { class: 'block' });
  const listsTitle = el('h2');
  const listName = el('input', { type: 'text', id: 'list-name', maxlength: '80' });
  const listNameLabel = el('label', { class: 'sr-only', for: 'list-name' });
  const saveButton = el('button', { type: 'button', class: 'quiet', id: 'save-list' });
  const listSelect = el('select', { id: 'saved-lists' });
  const listButtons = el('div', { class: 'row' });
  const loadButton = el('button', { type: 'button', class: 'quiet', id: 'load-list' });
  const deleteButton = el('button', { type: 'button', class: 'quiet', id: 'delete-list' });
  const shareButton = el('button', { type: 'button', class: 'quiet', id: 'share' });
  listButtons.append(loadButton, deleteButton, shareButton);
  listsBlock.append(listsTitle, listNameLabel, listName, saveButton, listSelect, listButtons);

  const historyBlock = el('section', { class: 'block' });
  const historyTitle = el('h2');
  const historyList = el('ul', { class: 'history', id: 'history' });
  const exportButton = el('button', { type: 'button', class: 'quiet', id: 'export' });
  historyBlock.append(historyTitle, historyList, exportButton);

  const status = el('p', { class: 'status', id: 'status', 'aria-live': 'polite' });
  panel.append(namesBlock, optionsBlock, listsBlock, historyBlock, status);
  layout.append(stage, panel);

  const footer = el('footer', { class: 'footer' });
  const footerLink = el('a', { href: DYNAMOGIC_URL });
  const footerMark = el('img', {
    class: 'mark',
    src: `${import.meta.env.BASE_URL}mark.svg`,
    alt: '',
    width: '24',
    height: '24',
  });
  const footerCredit = el('span');
  footerLink.append(footerMark, footerCredit);
  footer.append(footerLink);

  const liveWinner = el('p', {
    class: 'sr-only',
    id: 'live-winner',
    'aria-live': 'assertive',
    'aria-atomic': 'true',
  });

  page.append(mast, layout, footer);
  root.replaceChildren(page, liveWinner);

  return {
    root,
    title,
    tagline,
    langGroup,
    langButtons: [langFr, langEn],
    themeButton,
    canvas,
    winner,
    liveWinner,
    spinButton,
    spinHint,
    presentButton,
    namesLabel,
    count,
    textarea,
    hint,
    warnings,
    importButton,
    fileInput,
    clearButton,
    optionsTitle,
    removeInput,
    removeLabel: removeText,
    durationLabel,
    durationOutput,
    durationInput,
    shuffleButton,
    soundInput,
    soundLabel: soundText,
    listsTitle,
    listName,
    saveButton,
    listSelect,
    loadButton,
    deleteButton,
    shareButton,
    historyTitle,
    historyList,
    exportButton,
    status,
    footerLink,
    footerCredit,
    stageLabel,
  };
}

function setMeta(selector: string, content: string): void {
  const node = document.head.querySelector(selector);
  if (node) node.setAttribute('content', content);
}

function blocksSpinShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A';
}

function effectiveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'light' || choice === 'dark') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function mountApp(root: HTMLElement): void {
  const store: KeyValueStore | null = browserStore();
  let state: AppState = loadState(store);
  const shared = decodeNamesHash(location.hash);
  if (shared) state = { ...state, names: shared };

  const ui = buildUi(root);
  const wheel = new WheelView(ui.canvas);
  let spinning = false;
  let saveTimer = 0;
  let winnerTimer = 0;
  let flashTimer = 0;

  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(state.settings.lang, key, vars);

  function persist(): void {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveState(store, state), 120);
  }

  function syncHash(names: readonly string[]): void {
    const sharedNames = decodeNamesHash(location.hash);
    if (!sharedNames || sharedNames.join('\n') === names.join('\n')) return;
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  function setStatus(message: string): void {
    ui.status.textContent = message;
  }

  function currentNames(): string[] {
    return parseNameList(ui.textarea.value).names;
  }

  function updateCount(count: number): void {
    ui.count.textContent = t(count === 1 ? 'names.countOne' : 'names.countMany', { count });
  }

  function showWarnings(truncated: number, overflow: number): void {
    ui.warnings.replaceChildren();
    if (truncated > 0) {
      const line = document.createElement('p');
      line.textContent = t('names.truncated');
      ui.warnings.append(line);
    }
    if (overflow > 0) {
      const line = document.createElement('p');
      line.textContent = t('names.overflow');
      ui.warnings.append(line);
    }
  }

  function syncControls(): void {
    ui.spinButton.disabled = spinning || currentNames().length === 0;
    ui.spinButton.classList.toggle('is-busy', spinning);
    ui.spinButton.setAttribute('aria-busy', String(spinning));
    ui.textarea.disabled = spinning;
    ui.shuffleButton.disabled = spinning || currentNames().length < 2;
    ui.clearButton.disabled = spinning;
    ui.importButton.disabled = spinning;
  }

  function writeNames(names: string[], warnings?: { truncated: number; overflow: number }): void {
    ui.textarea.value = names.join('\n');
    state = { ...state, names };
    syncHash(names);
    updateCount(names.length);
    wheel.setNames(names);
    if (warnings) showWarnings(warnings.truncated, warnings.overflow);
    else showWarnings(0, 0);
    syncControls();
    persist();
  }

  function renderHistory(): void {
    ui.historyList.replaceChildren();
    if (state.history.length === 0) {
      const item = document.createElement('li');
      item.textContent = t('history.empty');
      ui.historyList.append(item);
      return;
    }
    const format = new Intl.DateTimeFormat(state.settings.lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    for (const entry of state.history) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = entry.name;
      const time = document.createElement('time');
      time.dateTime = entry.at;
      const parsed = Date.parse(entry.at);
      time.textContent = Number.isNaN(parsed) ? entry.at : format.format(parsed);
      item.append(name, time);
      ui.historyList.append(item);
    }
  }

  function renderLists(): void {
    const selected = ui.listSelect.value;
    ui.listSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('lists.choose');
    ui.listSelect.append(placeholder);
    for (const list of state.lists) {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = list.name;
      ui.listSelect.append(option);
    }
    if (selected && state.lists.some((list) => list.id === selected)) {
      ui.listSelect.value = selected;
    }
  }

  function applyTheme(): void {
    const mode = effectiveTheme(state.settings.theme);
    if (state.settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.settings.theme);
    const goingDark = mode === 'light';
    ui.themeButton.textContent = t(goingDark ? 'theme.dark' : 'theme.light');
    ui.themeButton.setAttribute('aria-label', t(goingDark ? 'theme.switchToDark' : 'theme.switchToLight'));
    const existing = document.querySelector('meta[name="theme-color"]');
    const meta = existing instanceof HTMLMetaElement ? existing : document.createElement('meta');
    if (meta.parentElement === null) {
      meta.name = 'theme-color';
      document.head.append(meta);
    }
    meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    wheel.setPalette(readPalette());
  }

  function applyLanguage(): void {
    const lang: Lang = state.settings.lang;
    const meta = socialMeta(lang);
    document.documentElement.lang = lang;
    document.title = meta.title;
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[property="og:locale"]', meta.locale);
    setMeta('meta[property="og:locale:alternate"]', meta.localeAlternate);
    setMeta('meta[property="og:image:alt"]', meta.imageAlt);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[name="twitter:description"]', meta.description);
    setMeta('meta[name="twitter:image:alt"]', meta.imageAlt);
    ui.title.textContent = t('header.title');
    ui.tagline.textContent = t('header.tagline');
    ui.langGroup.setAttribute('aria-label', t('lang.group'));
    for (const button of ui.langButtons) {
      const code = button.dataset.lang === 'en' ? 'en' : 'fr';
      button.textContent = t(code === 'en' ? 'lang.en' : 'lang.fr');
      button.setAttribute('aria-pressed', String(lang === code));
    }
    ui.stageLabel.textContent = t('spin.winnerLabel');
    ui.spinButton.textContent = t(spinning ? 'spin.spinning' : 'spin.action');
    ui.spinHint.textContent = t('spin.hint');
    ui.presentButton.textContent = t(
      document.body.classList.contains('is-presentation') ? 'presentation.exit' : 'presentation.enter',
    );
    ui.namesLabel.textContent = t('names.label');
    ui.textarea.placeholder = t('names.placeholder');
    ui.hint.textContent = t('names.hint');
    ui.importButton.textContent = t('names.import');
    ui.fileInput.setAttribute('aria-label', t('names.importAria'));
    ui.clearButton.textContent = t('names.clear');
    ui.optionsTitle.textContent = t('options.title');
    ui.removeLabel.textContent = t('options.removeWinner');
    ui.durationLabel.textContent = t('options.duration');
    ui.shuffleButton.textContent = t('options.shuffle');
    ui.soundLabel.textContent = t('options.sound');
    ui.listsTitle.textContent = t('lists.title');
    ui.listName.placeholder = t('lists.name');
    ui.listName.setAttribute('aria-label', t('lists.name'));
    ui.saveButton.textContent = t('lists.save');
    ui.loadButton.textContent = t('lists.load');
    ui.deleteButton.textContent = t('lists.delete');
    ui.shareButton.textContent = t('lists.share');
    ui.historyTitle.textContent = t('history.title');
    ui.exportButton.textContent = t('history.export');
    ui.footerCredit.textContent = t('footer.credit');
    updateDurationLabel();
    updateCount(currentNames().length);
    wheel.setEmptyLabel(t('wheel.empty'));
    renderHistory();
    renderLists();
    applyTheme();
  }

  function updateDurationLabel(): void {
    const seconds = Number(ui.durationInput.value);
    ui.durationOutput.textContent = t('options.durationValue', { seconds });
  }

  function showWinner(name: string, reduced: boolean): void {
    ui.winner.textContent = name;
    ui.winner.classList.remove('flash');
    window.clearTimeout(flashTimer);
    if (reduced) {
      ui.winner.classList.add('flash');
      flashTimer = window.setTimeout(() => ui.winner.classList.remove('flash'), 1000);
    }
    ui.liveWinner.textContent = '';
    window.clearTimeout(winnerTimer);
    winnerTimer = window.setTimeout(() => {
      ui.liveWinner.textContent = t('spin.announce', { name });
    }, 40);
  }

  function finishSpin(names: readonly string[], winnerIndex: number, reduced: boolean): void {
    const name = names[winnerIndex];
    spinning = false;
    if (name === undefined) {
      syncControls();
      ui.spinButton.textContent = t('spin.action');
      return;
    }
    showWinner(name, reduced);
    if (state.settings.sound) playWin();
    state = { ...state, history: rememberDraw(state.history, name, new Date().toISOString()) };
    renderHistory();
    if (state.settings.removeWinner) {
      const next = names.filter((_entry, index) => index !== winnerIndex);
      wheel.setHighlight(null);
      writeNames(next);
    } else {
      syncControls();
      persist();
    }
    ui.spinButton.textContent = t('spin.action');
    syncControls();
  }

  function spin(): void {
    if (spinning) return;
    const names = currentNames();
    if (names.length === 0) {
      setStatus(t('spin.needNames'));
      return;
    }
    let winnerIndex: number;
    try {
      winnerIndex = randomIndex(names.length);
    } catch {
      setStatus(t('spin.failed'));
      return;
    }
    writeNames(names);
    spinning = true;
    syncControls();
    ui.spinButton.textContent = t('spin.spinning');
    setStatus('');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (state.settings.sound) unlockAudio();
    wheel.spin({
      winner: winnerIndex,
      durationMs: state.settings.durationMs,
      turns: turnsForDuration(state.settings.durationMs),
      reducedMotion: reduced,
      onTick: () => {
        if (state.settings.sound) playTick();
      },
      onDone: () => finishSpin(names, winnerIndex, reduced),
    });
  }

  function saveList(): void {
    const name = ui.listName.value.trim().slice(0, 80);
    const names = currentNames();
    if (!name) {
      setStatus(t('lists.needName'));
      ui.listName.focus();
      return;
    }
    if (names.length === 0) {
      setStatus(t('lists.needNames'));
      return;
    }
    const list: SavedList = { id: createId(), name, names };
    state = { ...state, lists: upsertList(state.lists, list), names };
    renderLists();
    const stored = state.lists.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (stored) ui.listSelect.value = stored.id;
    setStatus(t('lists.saved'));
    persist();
  }

  function selectedList(): SavedList | undefined {
    return state.lists.find((list) => list.id === ui.listSelect.value);
  }

  async function share(): Promise<void> {
    const names = currentNames();
    const hash = encodeNamesHash(names);
    const url = `${location.origin}${location.pathname}${location.search}${hash}`;
    history.replaceState(null, '', hash);
    try {
      await navigator.clipboard.writeText(url);
      setStatus(t('lists.copied'));
      return;
    } catch {
      /* Clipboard can be denied. Fall back to a selection copy. */
    }
    const helper = document.createElement('textarea');
    helper.value = url;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.left = '-9999px';
    document.body.append(helper);
    helper.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    helper.remove();
    setStatus(t(copied ? 'lists.copied' : 'lists.copyFailed'));
  }

  function downloadHistory(): void {
    const csv = historyToCsv(state.history);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wheel-history.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function togglePresentation(): Promise<void> {
    const next = !document.body.classList.contains('is-presentation');
    document.body.classList.toggle('is-presentation', next);
    ui.presentButton.textContent = t(next ? 'presentation.exit' : 'presentation.enter');
    window.scrollTo(0, 0);
    wheel.resize();
    if (!next) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          /* Already left fullscreen. */
        }
      }
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* The enlarged layout still works without the Fullscreen API. */
    }
  }

  ui.textarea.value = state.names.join('\n');
  ui.removeInput.checked = state.settings.removeWinner;
  ui.soundInput.checked = state.settings.sound;
  ui.durationInput.value = String(state.settings.durationMs / 1000);
  wheel.setNames(state.names);
  applyLanguage();
  syncControls();

  ui.textarea.addEventListener('input', () => {
    const parsed = parseNameList(ui.textarea.value);
    state = { ...state, names: parsed.names };
    syncHash(parsed.names);
    updateCount(parsed.names.length);
    wheel.setNames(parsed.names);
    showWarnings(parsed.truncated, parsed.overflow);
    syncControls();
    persist();
  });

  ui.textarea.addEventListener('blur', () => {
    const parsed = parseNameList(ui.textarea.value);
    const normalized = parsed.names.join('\n');
    if (ui.textarea.value === normalized) return;
    ui.textarea.value = normalized;
    showWarnings(parsed.truncated, parsed.overflow);
  });

  ui.spinButton.addEventListener('click', () => spin());
  ui.presentButton.addEventListener('click', () => {
    void togglePresentation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.repeat || blocksSpinShortcut(event.target)) return;
    event.preventDefault();
    spin();
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('is-presentation')) {
      document.body.classList.remove('is-presentation');
      ui.presentButton.textContent = t('presentation.enter');
    } else {
      window.scrollTo(0, 0);
    }
    wheel.resize();
  });

  for (const button of ui.langButtons) {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang === 'en' ? 'en' : 'fr';
      if (lang === state.settings.lang) return;
      state = { ...state, settings: { ...state.settings, lang } };
      applyLanguage();
      persist();
    });
  }

  ui.themeButton.addEventListener('click', () => {
    const next = effectiveTheme(state.settings.theme) === 'dark' ? 'light' : 'dark';
    state = { ...state, settings: { ...state.settings, theme: next } };
    applyTheme();
    persist();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'system') applyTheme();
  });

  ui.removeInput.addEventListener('change', () => {
    state = { ...state, settings: { ...state.settings, removeWinner: ui.removeInput.checked } };
    persist();
  });

  ui.soundInput.addEventListener('change', () => {
    state = { ...state, settings: { ...state.settings, sound: ui.soundInput.checked } };
    if (ui.soundInput.checked) unlockAudio();
    persist();
  });

  ui.durationInput.addEventListener('input', () => {
    const seconds = Number(ui.durationInput.value);
    state = { ...state, settings: { ...state.settings, durationMs: seconds * 1000 } };
    updateDurationLabel();
    persist();
  });

  ui.shuffleButton.addEventListener('click', () => {
    const names = currentNames();
    if (names.length < 2 || spinning) return;
    writeNames(shuffle(names));
    wheel.setHighlight(null);
  });

  ui.clearButton.addEventListener('click', () => {
    if (spinning) return;
    writeNames([]);
    ui.winner.textContent = '';
    ui.liveWinner.textContent = '';
    wheel.setHighlight(null);
    setStatus('');
  });

  ui.importButton.addEventListener('click', () => ui.fileInput.click());
  ui.fileInput.addEventListener('change', () => {
    const file = ui.fileInput.files?.[0];
    ui.fileInput.value = '';
    if (!file || spinning) return;
    if (file.size > maxFileBytes()) {
      setStatus(t('names.fileTooBig'));
      return;
    }
    void file.text().then(
      (text) => {
        const parsed = parseImport(file.name, text);
        writeNames(parsed.names, parsed);
        wheel.setHighlight(null);
        setStatus('');
      },
      () => setStatus(t('names.fileError')),
    );
  });

  ui.saveButton.addEventListener('click', () => saveList());
  ui.listName.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    saveList();
  });

  ui.loadButton.addEventListener('click', () => {
    const list = selectedList();
    if (!list) {
      setStatus(t('lists.missing'));
      return;
    }
    writeNames(list.names);
    wheel.setHighlight(null);
    ui.winner.textContent = '';
    setStatus(t('lists.loaded'));
  });

  ui.deleteButton.addEventListener('click', () => {
    const list = selectedList();
    if (!list) {
      setStatus(t('lists.missing'));
      return;
    }
    state = { ...state, lists: state.lists.filter((item) => item.id !== list.id) };
    renderLists();
    setStatus(t('lists.deleted'));
    persist();
  });

  ui.shareButton.addEventListener('click', () => {
    void share();
  });
  ui.exportButton.addEventListener('click', () => downloadHistory());

  const resize = new ResizeObserver(() => wheel.resize());
  const wrap = ui.canvas.parentElement;
  if (wrap) resize.observe(wrap);
  window.addEventListener('resize', () => wheel.resize());
  void document.fonts.ready.then(() => wheel.resize());
}
