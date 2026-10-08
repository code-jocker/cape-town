/* Haptic feedback utility — graceful fallback, no-op if unsupported */

export const Haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(30),
  selection: () => vibrate(5),
  success: () => vibrate([10, 50, 10]),
  warning: () => vibrate([20, 30, 20]),
  error: () => vibrate([30, 20, 30, 20, 30]),

  // Cart specific
  addToCart: () => vibrate(15),
  removeFromCart: () => vibrate([10, 10, 10]),
  clearCart: () => vibrate([20, 20, 20]),
};

function vibrate(pattern) {
  if (!navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // Silently fail - haptics are enhancement only
  }
}

export default Haptic;