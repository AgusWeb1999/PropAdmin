'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  firstName:  z.string().min(1, 'Nombre requerido'),
  lastName:   z.string().min(1, 'Apellido requerido'),
  email:      z.string().email('Email inválido').optional().or(z.literal('')),
  phone:      z.string().optional(),
  documentId: z.string().optional(),
  type:       z.enum(['OWNER', 'TENANT']),
  startDate:  z.string().min(1, 'Fecha de inicio requerida'),
  endDate:    z.string().optional(),
  notes:      z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  apartmentId: string;
  apartmentNumber: string;
}

export function ResidentForm({ isOpen, onClose, onCreated, apartmentId, apartmentNumber }: Props) {
  const toast = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'OWNER',
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const type = watch('type');

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/residents/apartment/${apartmentId}`, {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        email: data.email || undefined,
      });
      toast.success('Residente registrado correctamente');
      reset();
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar residente');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nuevo residente — Apt ${apartmentNumber}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-3">
          {(['OWNER', 'TENANT'] as const).map((t) => (
            <label key={t} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${type === t ? 'border-slate-900 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input {...register('type')} type="radio" value={t} className="hidden" />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${type === t ? 'border-slate-900' : 'border-gray-300'}`}>
                {type === t && <div className="w-2 h-2 rounded-full bg-slate-900" />}
              </div>
              <span className="text-sm font-medium">{t === 'OWNER' ? 'Propietario' : 'Inquilino'}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre" error={errors.firstName?.message} required>
            <input {...register('firstName')} placeholder="Juan" className={inputClass(errors.firstName?.message)} />
          </FormField>

          <FormField label="Apellido" error={errors.lastName?.message} required>
            <input {...register('lastName')} placeholder="García" className={inputClass(errors.lastName?.message)} />
          </FormField>

          <FormField label="Teléfono" error={errors.phone?.message}>
            <input {...register('phone')} placeholder="+598 99 123 456" className={inputClass()} />
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="juan@email.com" className={inputClass(errors.email?.message)} />
          </FormField>

          <FormField label="Cédula / Documento">
            <input {...register('documentId')} placeholder="1.234.567-8" className={inputClass()} />
          </FormField>

          <FormField label="Fecha de inicio" error={errors.startDate?.message} required>
            <input {...register('startDate')} type="date" className={inputClass(errors.startDate?.message)} />
          </FormField>

          {type === 'TENANT' && (
            <FormField label="Fecha de fin contrato">
              <input {...register('endDate')} type="date" className={inputClass()} />
            </FormField>
          )}

          <div className="col-span-2">
            <FormField label="Observaciones">
              <textarea {...register('notes')} rows={2} placeholder="Notas internas..." className={inputClass() + ' resize-none'} />
            </FormField>
          </div>
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
            Registrar residente
          </button>
        </div>
      </form>
    </Modal>
  );
}
