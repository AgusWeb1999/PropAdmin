import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: string) => void;
}

const add = (set: (fn: (s: ToastState) => Partial<ToastState>) => void, message: string, type: Toast['type']) => {
  const id = Math.random().toString(36).slice(2);
  set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
  setTimeout(() => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, 3500);
};

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  success: (message) => add(set, message, 'success'),
  error: (message) => add(set, message, 'error'),
  info: (message) => add(set, message, 'info'),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
