/** Round to whole RWF (no decimals). */
export const round = (n) => Math.round(n);

/**
 * Pure price calculation — the ONLY place totals are computed.
 * @param {Array} items  [{priceSnapshot, quantity, selectedOptions:[{choices:[{extraPrice}]}]}]
 * @param {{taxRate:Number, serviceCharge:Number}} settings  rates in percent (8 = 8%)
 * @param {{type:'percent'|'fixed', value:Number}|null} promo
 */
export function computeTotals(items, settings, promo = null) {
  const subtotal = round(
    items.reduce((sum, it) => {
      const extras = (it.selectedOptions || []).reduce(
        (s, opt) =>
          s + (opt.choices || []).reduce((cs, c) => cs + (Number(c.extraPrice) || 0), 0),
        0
      );
      return sum + (Number(it.priceSnapshot) + extras) * it.quantity;
    }, 0)
  );

  let discount = 0;
  if (promo && promo.type === 'percent') discount = round((subtotal * promo.value) / 100);
  if (promo && promo.type === 'fixed') discount = Math.min(round(promo.value), subtotal);
  discount = Math.max(0, Math.min(discount, subtotal));

  const taxable = subtotal - discount;
  const tax = round((taxable * (settings.taxRate || 0)) / 100);
  const serviceCharge = round((taxable * (settings.serviceCharge || 0)) / 100);
  const total = taxable + tax + serviceCharge;

  return { subtotal, discount, tax, serviceCharge, total };
}

/**
 * Is a menu item orderable right now? Checks availability + schedule window.
 * @param {Object} item  lean MenuItem
 * @param {Date} now
 * @param {string} tz  timezone for the schedule check
 */
export function isItemAvailableNow(item, now = new Date(), tz = 'Africa/Kigali') {
  if (!item.isAvailable) return false;
  if (item.trackStock && item.stockQty <= 0) return false;
  if (!item.availableFrom || !item.availableTo) return true;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [h, m] = fmt.format(now).split(':').map(Number);
  const cur = h * 60 + m;
  const [fh, fm] = item.availableFrom.split(':').map(Number);
  const [th, tm] = item.availableTo.split(':').map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;

  if (from <= to) return cur >= from && cur < to;
  return cur >= from || cur < to; // window crossing midnight
}
