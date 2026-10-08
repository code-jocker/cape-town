/**
 * Kitchen alert sounds without any audio assets: tiny oscillator beeps.
 * Browsers block audio until a user gesture — call unlockAudio() from the
 * first click (the "Start shift" button) to arm everything.
 */

let ctx = null;
let enabled = true;

export function unlockAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  // Play a silent buffer to fully unlock on iOS.
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  enabled = true;
}

export function disableAudio() {
  enabled = false;
}

export function audioEnabled() {
  return enabled && ctx && ctx.state === 'running';
}

function beep(freq, durationMs, delayMs = 0, type = 'sine', gain = 0.12) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  vol.gain.setValueAtTime(gain, t0);
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(vol).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000);
}

/** Two-tone alert for a new order. */
export function playNewOrder() {
  beep(880, 140, 0);
  beep(1175, 180, 150);
  vibrate([120, 80, 120]);
}

/** Softer single tone for status updates. */
export function playStatus() {
  beep(660, 120, 0, 'triangle', 0.08);
}

export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/** Browser notification (permission requested on Start shift). */
export async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    /* notification failures are never fatal */
  }
}

export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }
}
