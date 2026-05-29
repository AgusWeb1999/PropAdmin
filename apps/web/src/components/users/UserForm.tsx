'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName:  z.string().min(1, 'Requerido'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  phone:     z.string().optional(),
  role:      z.enum(['EMPLOYEE', 'COMPANY_ADMIN']),
});
type FormData = z.infer<typeof schema>;

export function UserForm({ isOpen, onClose, onCreated }: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'EMPLOYEE' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/users', data);
      toast.success('Usuario creado. Ya puede iniciar sesión.');
      reset();
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear usuario');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre" error={errors.firstName?.message} required>
            <input {...register('firstName')} placeholder="Laura" className={inputClass(errors.firstName?.message)} />
          </FormField>
          <FormField label="Apellido" error={errors.lastName?.message} required>
            <input {...register('lastName')} placeholder="González" className={inputClass(errors.lastName?.message)} />
          </FormField>
        </div>

        <FormField label="Email" error={errors.email?.message} required>
          <input {...register('email')} type="email" placeholder="laura@empresa.com" className={inputClass(errors.email?.message)} />
        </FormField>

        <FormField label="Contraseña" error={errors.password?.message} required hint="Mínimo 8 caracteres">
          <div className="relative">
            <input
              {...register('password')}
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              className={inputClass(errors.password?.message) + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teléfono" error={errors.phone?.message}>
            <input {...register('phone')} placeholder="+598 99 000 000" className={inputClass()} />
          </FormField>
          <FormField label="Rol" required>
            <select {...register('role')} className={inputClass()}>
              <option value="EMPLOYEE">Empleado</option>
              <option value="COMPANY_ADMIN">Administrador</option>
            </select>
          </FormField>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Permisos por rol:</p>
          <p><span className="font-medium">Empleado</span> — puede registrar pagos, cargar gastos, ver morosos</p>
          <p><span className="font-medium">Administrador</span> — acceso completo, puede crear y gestionar usuarios</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Crear usuario
          </button>
        </div>
      </form>
    </Modal>
  );
}
