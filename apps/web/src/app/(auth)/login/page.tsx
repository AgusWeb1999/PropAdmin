'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña requerida'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password);
      router.push('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">PropAdmin</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de edificios simplificada</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@empresa.com"
                autoComplete="email"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all',
                  'bg-white placeholder:text-slate-400',
                  'focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900',
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <a href="/forgot-password" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all',
                  'bg-white placeholder:text-slate-400',
                  'focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900',
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'bg-slate-900 text-white text-sm font-medium',
                'px-4 py-2.5 rounded-lg transition-all',
                'hover:bg-slate-800 active:scale-[0.98]',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿Primera vez?{' '}
          <a href="/register" className="text-slate-900 font-medium hover:underline">
            Crear cuenta gratis
          </a>
        </p>
      </div>
    </div>
  );
}
