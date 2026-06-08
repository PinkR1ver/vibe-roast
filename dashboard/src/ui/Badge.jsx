const VARIANTS = {
  success: "bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-oai-gray-100 text-oai-gray-700 dark:bg-oai-gray-800 dark:text-oai-gray-300",
  secondary: "bg-oai-gray-100 text-oai-gray-600 dark:bg-oai-gray-800 dark:text-oai-gray-400",
};

export default function Badge({ variant = "info", children, className = "" }) {
  const base = VARIANTS[variant] || VARIANTS.info;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${base} ${className}`}>
      {children}
    </span>
  );
}
