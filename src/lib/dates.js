function dayBounds(from, to) {
  return {
    fromMs: from ? Date.parse(`${from}T00:00:00.000Z`) : null,
    toMs: to ? Date.parse(`${to}T23:59:59.999Z`) : null,
  };
}

function isInRange(timestamp, range) {
  const bounds = normalizeRange(range);
  const hasActiveRange = bounds.fromMs != null || bounds.toMs != null;
  if (!timestamp) return !hasActiveRange;
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return !hasActiveRange;
  if (bounds.fromMs != null && ms < bounds.fromMs) return false;
  if (bounds.toMs != null && ms > bounds.toMs) return false;
  return true;
}

function normalizeRange(range) {
  if (!range) return { fromMs: null, toMs: null };
  return {
    fromMs: finiteNumber(range.fromMs) ?? parseBoundary(range.from, "start"),
    toMs: finiteNumber(range.toMs) ?? parseBoundary(range.to, "end"),
  };
}

function parseBoundary(value, side) {
  if (!value) return null;
  const raw = String(value);
  const stamp = raw.includes("T")
    ? raw
    : `${raw}T${side === "start" ? "00:00:00.000Z" : "23:59:59.999Z"}`;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) ? ms : null;
}

function finiteNumber(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = { dayBounds, isInRange };
