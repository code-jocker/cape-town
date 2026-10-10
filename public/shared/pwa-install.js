/**
 * PWA install prompt — shows a dismissible banner when the browser detects the
 * app can be installed (beforeinstallprompt event). Works on mobile (PWA to
 * Home Screen) and desktop (PWA install dialog).
 *
 * Usage:
 *   import { initInstallPrompt } from '../shared/pwa-install.js';
 *   initInstallPrompt({
 *     onShow: (dismiss) => { /* inject banner into DOM, call dismiss() on close */ },
 *     storageKey: 'pwa-install-dismissed'
 *   });
 */

let deferredPrompt = null;
const DISMISSED_KEY = 'pwa-install-dismissed';
const SHOWN_KEY = 'pwa-install-shown';

export function initInstallPrompt(opts = {}) {
  const {
    onShow,
    storageKey = DISMISSED_KEY,
    showOnAll = false
  } = opts;

  if (!onShow) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    maybeShowBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(SHOWN_KEY);
    onUninstall?.();
  });

  function maybeShowBanner() {
    if (!deferredPrompt) return;
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === 'true') return;
    if (!showOnAll && localStorage.getItem(SHOWN_KEY) === 'true') return;

    const onDismiss = () => {
      localStorage.setItem(storageKey, 'true');
      localStorage.removeItem(SHOWN_KEY);
      cleanup();
    };

    onShow({
      prompt: () => {
        if (deferredPrompt) {
          localStorage.setItem(SHOWN_KEY, 'true');
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              localStorage.setItem(storageKey, 'true');
            }
            deferredPrompt = null;
            cleanup();
          });
        }
      },
      dismiss: onDismiss,
      close: onDismiss
    });
  }

  function cleanup() {
    deferredPrompt = null;
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    localStorage.setItem(storageKey, 'true');
  }
}
