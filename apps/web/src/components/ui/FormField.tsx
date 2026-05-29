import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, required, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export const inputClass = (error?: string) => cn(
  'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all',
  'bg-white placeholder:text-slate-400',
  'focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900',
  error ? 'border-red-300 bg-red-50' : 'border-gray-200'
);
