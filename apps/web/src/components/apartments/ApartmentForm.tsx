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
  number:      z.string().min(1, 'Número requerido'),
  floor:       z.string().optional(),
  coefficient: z.coerce.number().positive('El coeficiente debe ser mayor a 0'),
  area:        z.coerce.number().positive().optional().or(z.literal('')),
  bedrooms:    z.coerce.number().int().min(0).optional().or(z.literal('')),
  bathrooms:   z.coerce.number().int().min(0).optional().or(z.literal('')),
  hasParking:  z.boolean().optional(),
  hasStorage:  z.boolean().optional(),
  status:      z.enum(['OCCUPIED', 'VACANT', 'MAINTENANCE']),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  buildingId: string;
}

export function ApartmentForm({ isOpen, onClose, onCreated, buildingId }: Props) {
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'OCCUPIED', hasParking: false, hasStorage: false },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/apartments/building/${buildingId}`, {
        ...data,
        area:      data.area || undefined,
        bedrooms:  data.bedrooms || undefined,
        bathrooms: data.bathrooms || undefined,
      });
      toast.success('Apartamento creado correctamente');
      reset();
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear apartamento');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo apartamento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número / Identificador" error={errors.number?.message} required>
            <input {...register('number')} placeholder="Ej: 101" className={inputClass(errors.number?.message)} />
          </FormField>

          <FormField label="Piso" error={errors.floor?.message}>
            <input {...register('floor')} placeholder="Ej: 1, PH, Planta Baja" className={inputClass()} />
          </FormField>

          <FormField
            label="Coeficiente"
            error={errors.coefficient?.message}
            required
            hint="Ej: 0.08 = 8% del total"
          >
            <input {...register('coefficient')} type="number" step="0.000001" placeholder="0.083333" className={inputClass(errors.coefficient?.message)} />
          </FormField>

          <FormField label="Superficie (m²)" error={errors.area?.message as string}>
            <input {...register('area')} type="number" step="0.01" placeholder="75" className={inputClass()} />
          </FormField>

          <FormField label="Dormitorios">
            <input {...register('bedrooms')} type="number" min={0} placeholder="2" className={inputClass()} />
          </FormField>

          <FormField label="Baños">
            <input {...register('bathrooms')} type="number" min={0} placeholder="1" className={inputClass()} />
          </FormField>

          <FormField label="Estado">
            <select {...register('status')} className={inputClass()}>
              <option value="OCCUPIED">Ocupado</option>
              <option value="VACANT">Vacío</option>
              <option value="MAINTENANCE">En obra</option>
            </select>
          </FormField>

          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('hasParking')} type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-700">Tiene cochera</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('hasStorage')} type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-700">Tiene baulera</span>
            </label>
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
            Crear apartamento
          </button>
        </div>
      </form>
    </Modal>
  );
}
