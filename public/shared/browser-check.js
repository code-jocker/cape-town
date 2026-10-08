/* Browser compatibility check — supports old and new browsers */
(function () {
  'use strict';

  const ua = navigator.userAgent || '';
  const isOldChrome = /Chrome\/(\d+)/.test(ua) && parseInt(RegExp.$1, 10) < 80;
  const isOldEdge = /Edg\/(\d+)/.test(ua) && parseInt(RegExp.$1, 10) < 80;
  const isOldFirefox = /Firefox\/(\d+)/.test(ua) && parseInt(RegExp.$1, 10) < 78;
  const isOldSafari = /Version\/(\d+)\.(\d+)/.test(ua) && parseInt(RegExp.$1, 10) < 14;
  const isOld = isOldChrome || isOldEdge || isOldFirefox || isOldSafari;

  // Polyfill: CSS.supports() for gap on flex (old Chrome < 66)
  if (typeof CSS !== 'undefined' && !CSS.supports('gap: 1px')) {
    const style = document.createElement('style');
    style.textContent = [
      '.flex > *:not(:last-child) { margin-right: 8px; }',
      '.flex > .flex-gap-4 > *:not(:last-child) { margin-right: 4px; }',
      '.flex > .flex-gap-5 > *:not(:last-child) { margin-right: 5px; }',
      '.flex > .flex-gap-6 > *:not(:last-child) { margin-right: 6px; }',
      '.flex > .flex-gap-8 > *:not(:last-child) { margin-right: 8px; }',
      '.flex > .flex-gap-10 > *:not(:last-child) { margin-right: 10px; }',
      '.flex > .flex-gap-12 > *:not(:last-child) { margin-right: 12px; }',
      '.flex > .flex-gap-14 > *:not(:last-child) { margin-right: 14px; }',
      '.flex > .flex-gap-16 > *:not(:last-child) { margin-right: 16px; }',
      '.flex > .flex-gap-18 > *:not(:last-child) { margin-right: 18px; }',
      '.flex > .flex-gap-24 > *:not(:last-child) { margin-right: 24px; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Polyfill: IntersectionObserver for very old browsers
  if (!('IntersectionObserver' in window)) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/intersection-observer@0.5.6/intersection-observer.js';
    document.head.appendChild(script);
  }

  // Polyfill: smooth scroll for old browsers
  if (!('scrollBehavior' in document.documentElement.style)) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/smooth-scroll@16.1.3/dist/smooth-scroll.min.js';
    document.head.appendChild(script);
  }

  // Show update banner for old browsers
  if (isOld) {
    const banner = document.createElement('div');
    banner.id = 'browser-update-banner';
    banner.style.cssText = [
      'position:fixed',
      'bottom:0;left:0;right:0',
      'background:#b45309',
      'color:#fff',
      'padding:10px 16px',
      'text-align:center',
      'font-size:0.85rem',
      'z-index:9999',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
    ].join(';');
    banner.innerHTML = 'Cape Town K Hotel works best on a newer browser. ' +
      'Please update Chrome, Edge, Firefox or Safari for the best experience. ' +
      '<button id="dismiss-browser-banner" style="background:rgba(255,255,255,0.2);border:0;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;margin-left:8px">Dismiss</button>';
    document.body.appendChild(banner);
    document.getElementById('dismiss-browser-banner').addEventListener('click', function () {
      banner.remove();
    });
  }

  // Prototype polyfills so the app modules run on old engines
  // (Chrome < 86 replaceChildren, < 85 replaceAll, < 69 flat/flatMap)
  if (typeof Element !== 'undefined' && !Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function () {
      while (this.firstChild) this.removeChild(this.firstChild);
      for (var i = 0; i < arguments.length; i++) this.appendChild(arguments[i]);
    };
  }
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
      var str = String(this);
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
        return str.replace(search, replacement);
      }
      return str.split(String(search)).join(String(replacement));
    };
  }
  if (!Array.prototype.flat) {
    Array.prototype.flat = function (depth) {
      var d = depth == null ? 1 : Number(depth) || 0;
      var out = [];
      for (var j = 0; j < this.length; j++) {
        var v = this[j];
        if (Array.isArray(v) && d > 0) out = out.concat(v.flat(d - 1));
        else out.push(v);
      }
      return out;
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (fn, thisArg) {
      var out = [];
      for (var k = 0; k < this.length; k++) {
        var r = thisArg ? fn.call(thisArg, this[k], k, this) : fn(this[k], k, this);
        if (Array.isArray(r)) out = out.concat(r);
        else out.push(r);
      }
      return out;
    };
  }
})();