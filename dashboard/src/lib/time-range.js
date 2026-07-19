export function buildTimeRange(mode, customRange = {}, now = new Date()) {
  if (mode === "total") return { label: "All time" };
  if (mode === "custom") {
    const from = customRange.from || undefined;
    const to = customRange.to || undefined;
    return {
      from,
      to,
      label: rangeLabel(from, to),
    };
  }

  const end = new Date(now);
  const start = new Date(end);
  if (mode === "week") start.setUTCDate(end.getUTCDate() - 6);
  if (mode === "month") start.setUTCDate(end.getUTCDate() - 29);

  const from = formatDate(start);
  const to = formatDate(end);
  return {
    from,
    to,
    label: rangeLabel(from, to),
  };
}

export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function rangeLabel(from, to) {
  if (from && to && from === to) return from;
  if (from && to) return `${from} - ${to}`;
  if (from) return `${from} -`;
  if (to) return `- ${to}`;
  return "All time";
}
