/* Keep the storage key in sync with STORAGE_KEY in src/lib/storage.ts. */
(function () {
  try {
    var raw = localStorage.getItem('wheel.v1');
    if (!raw) return;
    var data = JSON.parse(raw);
    var settings = data && data.settings;
    if (!settings) return;
    if (settings.theme === 'light' || settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    if (settings.lang === 'fr' || settings.lang === 'en') {
      document.documentElement.lang = settings.lang;
    }
  } catch {
    /* Storage can throw in private mode. */
  }
})();
