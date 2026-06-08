export default function Card({ title, subtitle, className = "", children }) {
  return (
    <div className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors duration-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          {title && <h4 className="text-h4 text-neutral-950 dark:text-neutral-50">{title}</h4>}
          {subtitle && <p className="text-caption text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
