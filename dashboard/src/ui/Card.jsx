export default function Card({ title, subtitle, className = "", children }) {
  return (
    <div className={`rounded-xl border border-oai-gray-200 dark:border-oai-gray-800 bg-white dark:bg-oai-gray-900 transition-colors duration-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-5 py-3 border-b border-oai-gray-200 dark:border-oai-gray-800 transition-colors duration-200">
          {title && (
            <h3 className="text-xs font-medium uppercase tracking-wider text-oai-gray-500 dark:text-oai-gray-300 transition-colors duration-200">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-oai-gray-500 dark:text-oai-gray-300 mt-1 transition-colors duration-200">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
