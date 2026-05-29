'use client';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
  error:   <XCircle    className="w-4 h-4 text-red-500 shrink-0" />,
  info:    <Info       className="w-4 h-4 text-blue-500 shrink-0" />,
};

const STYLES = {
  success: 'border-emerald-100 bg-white',
  error:   'border-red-100 bg-white',
  info:    'border-blue-100 bg-white',
};

export function Toaster() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg',
            'pointer-events-auto animate-slide-up min-w-[260px] max-w-sm',
            STYLES[t.type]
          )}
        >
          {ICONS[t.type]}
          <p className="text-sm text-slate-700 flex-1">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
