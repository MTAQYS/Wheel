/* Keep the storage key in sync with STORAGE_KEY in src/lib/storage.ts. */
/* Theme colors match --dg-bg in src/style.css (light #F5F3EE, dark #0E0F11). */
(function () {
  var LIGHT = '#F5F3EE';
  var DARK = '#0E0F11';

  function themeColor(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var light =
      theme === 'light' ||
      (theme !== 'dark' && window.matchMedia('(prefers-color-scheme: light)').matches);
    meta.setAttribute('content', light ? LIGHT : DARK);
  }

  themeColor('system');

  try {
    var raw = localStorage.getItem('wheel.v1');
    if (!raw) return;
    var data = JSON.parse(raw);
    var settings = data && data.settings;
    if (!settings) return;
    if (settings.theme === 'light' || settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', settings.theme);
      themeColor(settings.theme);
    }
    if (settings.lang === 'fr' || settings.lang === 'en') {
      document.documentElement.lang = settings.lang;
    }
  } catch {
    /* Storage can throw in private mode. */
  }
})();
