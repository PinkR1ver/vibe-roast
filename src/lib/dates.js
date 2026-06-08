function dayBounds(from, to) {
  return {
    fromMs: from ? Date.parse(`${from}T00:00:00.000Z`) : null,
    toMs: to ? Date.parse(`${to}T23:59:59.999Z`) : null,
  };
}

function isInRange(timestamp, range) {
  if (!timestamp) return true;
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return true;
  if (range.fromMs != null && ms < range.fromMs) return false;
  if (range.toMs != null && ms > range.toMs) return false;
  return true;
}

module.exports = { dayBounds, isInRange };
