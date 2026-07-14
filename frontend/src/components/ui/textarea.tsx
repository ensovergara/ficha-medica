import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
          "bg-white text-gray-900 placeholder:text-gray-400",
          "dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
            : "border-gray-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:focus:border-primary-500",
          className
        )}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
