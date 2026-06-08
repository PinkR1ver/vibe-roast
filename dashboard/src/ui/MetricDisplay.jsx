export default function MetricDisplay({ value, label, className = "" }) {
  const formatted = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className={`text-center ${className}`}>
      <div className="text-hero tabular-nums text-brand-600 dark:text-brand-400">{formatted}</div>
      <div className="text-label uppercase text-neutral-500 dark:text-neutral-400 mt-1">{label}</div>
    </div>
  );
}
