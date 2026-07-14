import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        className={cn(
          "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
          "bg-white text-gray-900",
          "dark:bg-slate-700 dark:text-slate-100",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
            : "border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:focus:border-primary-500",
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
