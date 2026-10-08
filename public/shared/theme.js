/* Theme management — persists preference, respects system, no flash */

(() => {
  const STORAGE_KEY = 'cape-town-k-theme';
  const DARK_CLASS = 'dark';
  const THEME_ATTR = 'data-theme';

  const getSystemPreference = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const getStoredTheme = () => localStorage.getItem(STORAGE_KEY);
  const setStoredTheme = (theme) => localStorage.setItem(STORAGE_KEY, theme);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute(THEME_ATTR, theme);
    document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  };

  const initTheme = () => {
    const stored = getStoredTheme();
    if (stored) {
      applyTheme(stored);
      return;
    }
    applyTheme(getSystemPreference() ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute(THEME_ATTR) === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
    updateToggleButton(next);
  };

  const updateToggleButton = (theme) => {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark');
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };

  const syncToggleButton = () => {
    const theme = document.documentElement.getAttribute(THEME_ATTR);
    updateToggleButton(theme);
  };

  const handleSystemChange = (e) => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? 'dark' : 'light');
      syncToggleButton();
    }
  };

  initTheme();
  syncToggleButton();

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemChange);

  window.Theme = {
    get: () => document.documentElement.getAttribute(THEME_ATTR),
    set: (theme) => {
      applyTheme(theme);
      setStoredTheme(theme);
      syncToggleButton();
    },
    toggle: toggleTheme,
  };
})();