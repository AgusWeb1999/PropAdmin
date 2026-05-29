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
  name:         z.string().min(2, 'Nombre requerido'),
  address:      z.string().min(5, 'Dirección requerida'),
  city:         z.string().min(2, 'Ciudad requerida'),
  department:   z.string().optional(),
  totalUnits:   z.coerce.number().int().min(1, 'Mínimo 1 unidad'),
  reserveFund:  z.coerce.number().min(0).optional(),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  currency:     z.enum(['UYU', 'USD']),
  notes:        z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function BuildingForm({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'UYU', interestRate: 3 },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/buildings', {
        ...data,
        interestRate: (data.interestRate ?? 3) / 100,
      });
      toast.success('Edificio creado correctamente');
      reset();
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear edificio');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo edificio" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Nombre del edificio" error={errors.name?.message} required>
              <input {...register('name')} placeholder="Ej: Edificio Punta Carretas" className={inputClass(errors.name?.message)} />
            </FormField>
          </div>

          <div className="col-span-2">
            <FormField label="Dirección" error={errors.address?.message} required>
              <input {...register('address')} placeholder="Ej: Ellauri 452" className={inputClass(errors.address?.message)} />
            </FormField>
          </div>

          <FormField label="Ciudad" error={errors.city?.message} required>
            <input {...register('city')} placeholder="Montevideo" className={inputClass(errors.city?.message)} />
          </FormField>

          <FormField label="Departamento" error={errors.department?.message}>
            <input {...register('department')} placeholder="Montevideo" className={inputClass()} />
          </FormField>

          <FormField label="Total de unidades" error={errors.totalUnits?.message} required>
            <input {...register('totalUnits')} type="number" min={1} placeholder="12" className={inputClass(errors.totalUnits?.message)} />
          </FormField>

          <FormField label="Moneda">
            <select {...register('currency')} className={inputClass()}>
              <option value="UYU">UYU — Peso uruguayo</option>
              <option value="USD">USD — Dólar</option>
            </select>
          </FormField>

          <FormField label="Fondo de reserva" error={errors.reserveFund?.message}>
            <input {...register('reserveFund')} type="number" min={0} placeholder="0" className={inputClass()} />
          </FormField>

          <FormField label="Tasa de interés por mora (%)" error={errors.interestRate?.message} hint="Default: 3% mensual">
            <input {...register('interestRate')} type="number" step="0.1" min={0} max={100} placeholder="3" className={inputClass()} />
          </FormField>

          <div className="col-span-2">
            <FormField label="Observaciones" error={errors.notes?.message}>
              <textarea {...register('notes')} rows={2} placeholder="Notas internas..." className={inputClass() + ' resize-none'} />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancelar
          </button>
          <button
            type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Crear edificio
          </button>
        </div>
      </form>
    </Modal>
  );
}
