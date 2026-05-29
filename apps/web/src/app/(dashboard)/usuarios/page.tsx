'use client';
import { useEffect, useState } from 'react';
import { Plus, Users, Shield, UserCheck, UserX, KeyRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { UserForm } from '@/components/users/UserForm';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'COMPANY_ADMIN' | 'EMPLOYEE';
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Administrador',
  EMPLOYEE:      'Empleado',
};

const ROLE_COLORS: Record<string, string> = {
  COMPANY_ADMIN: 'bg-purple-100 text-purple-700',
  EMPLOYEE:      'bg-blue-100 text-blue-700',
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const { user: me } = useAuth();

  const load = () => {
    setLoading(true);
    api.get<User[]>('/users').then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deactivate = async (u: User) => {
    if (!confirm(`¿Desactivar a ${u.firstName} ${u.lastName}?`)) return;
    try {
      await api.post(`/users/${u.id}/deactivate`, {});
      toast.success('Usuario desactivado');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const resetPassword = async (u: User) => {
    const pwd = prompt(`Nueva contraseña para ${u.firstName} ${u.lastName} (mín. 8 caracteres):`);
    if (!pwd || pwd.length < 8) return;
    try {
      await api.post(`/users/${u.id}/reset-password`, { password: pwd });
      toast.success('Contraseña actualizada');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <>
      <Header
        title="Usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? 's' : ''} en tu empresa`}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo usuario
          </button>
        }
      />

      <div className="p-6 space-y-5 animate-slide-up">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Sin usuarios adicionales</p>
                <p className="text-sm text-slate-400">Agregá empleados para que puedan acceder al sistema</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Nombre', 'Email', 'Rol', 'Estado', 'Último acceso', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className={cn('hover:bg-gray-50 transition-colors', !u.isActive && 'opacity-50')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-slate-600">
                              {u.firstName[0]}{u.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                            {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[u.role])}>
                          <Shield className="w-3 h-3" />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><UserCheck className="w-3 h-3" /> Activo</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-gray-100 px-2 py-0.5 rounded-full"><UserX className="w-3 h-3" /> Inactivo</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('es-UY')
                          : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== me?.id && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => resetPassword(u)}
                              title="Resetear contraseña"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            {u.isActive && (
                              <button
                                onClick={() => deactivate(u)}
                                title="Desactivar usuario"
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <UserForm isOpen={showForm} onClose={() => setShowForm(false)} onCreated={load} />
    </>
  );
}
