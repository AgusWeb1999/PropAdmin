'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  buildingId: z.string().min(1, 'Seleccioná una propiedad'),
  apartmentId: z.string().min(1, 'Seleccioná un apartamento'),
  ownerResidentId: z.string().min(1, 'Seleccioná el propietario'),
  tenantResidentId: z.string().min(1, 'Seleccioná el inquilino'),
  rentAmount: z.coerce.number().positive('El alquiler debe ser mayor a 0'),
  commissionPct: z.coerce.number().min(0).max(100),
  currency: z.string().min(1),
  startDate: z.string().min(1, 'Fecha requerida'),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Building { id: string; name: string; currency: string }
interface Apartment { id: string; number: string; floor: string | null }
interface Resident { id: string; firstName: string; lastName: string; type: string; isActive: boolean }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function RentalContractForm({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'UYU',
      commissionPct: 10,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const buildingId = watch('buildingId');
  const apartmentId = watch('apartmentId');

  useEffect(() => {
    if (!isOpen) return;
    api.get<Building[]>('/buildings').then(setBuildings);
  }, [isOpen]);

  useEffect(() => {
    if (!buildingId) return;
    setValue('apartmentId', '');
    setValue('ownerResidentId', '');
    setValue('tenantResidentId', '');
    setResidents([]);
    api.get<Apartment[]>(`/apartments/building/${buildingId}`).then(setApartments);
    const building = buildings.find((b) => b.id === buildingId);
    if (building) setValue('currency', building.currency);
  }, [buildingId, buildings, setValue]);

  useEffect(() => {
    if (!apartmentId) return;
    setValue('ownerResidentId', '');
    setValue('tenantResidentId', '');
    api.get<Resident[]>(`/residents/apartment/${apartmentId}`).then((data) =>
      setResidents(data.filter((r) => r.isActive))
    );
  }, [apartmentId, setValue]);

  const owners = residents.filter((r) => r.type === 'OWNER');
  const tenants = residents.filter((r) => r.type === 'TENANT');

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/rental-contracts/apartment/${data.apartmentId}`, {
        ownerResidentId: data.ownerResidentId,
        tenantResidentId: data.tenantResidentId,
        rentAmount: data.rentAmount,
        commissionPct: data.commissionPct / 100,
        currency: data.currency,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        notes: data.notes,
      });
      toast.success('Contrato de alquiler creado correctamente');
      reset();
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear el contrato');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo contrato de alquiler" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Propiedad" error={errors.buildingId?.message} required>
            <select {...register('buildingId')} className={inputClass(errors.buildingId?.message)}>
              <option value="">Seleccionar...</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>

          <FormField label="Apartamento" error={errors.apartmentId?.message} required>
            <select {...register('apartmentId')} disabled={!buildingId} className={inputClass(errors.apartmentId?.message)}>
              <option value="">Seleccionar...</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.number}{a.floor ? ` (Piso ${a.floor})` : ''}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Propietario"
            error={errors.ownerResidentId?.message}
            required
            hint={apartmentId && owners.length === 0 ? 'No hay residentes tipo OWNER en este apartamento — creá uno primero en Residentes' : undefined}
          >
            <select {...register('ownerResidentId')} disabled={!apartmentId} className={inputClass(errors.ownerResidentId?.message)}>
              <option value="">Seleccionar...</option>
              {owners.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
            </select>
          </FormField>

          <FormField
            label="Inquilino"
            error={errors.tenantResidentId?.message}
            required
            hint={apartmentId && tenants.length === 0 ? 'No hay residentes tipo TENANT en este apartamento — creá uno primero en Residentes' : undefined}
          >
            <select {...register('tenantResidentId')} disabled={!apartmentId} className={inputClass(errors.tenantResidentId?.message)}>
              <option value="">Seleccionar...</option>
              {tenants.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Alquiler mensual" error={errors.rentAmount?.message} required>
            <input {...register('rentAmount')} type="number" step="0.01" placeholder="0" className={inputClass(errors.rentAmount?.message)} />
          </FormField>

          <FormField label="Comisión (%)" error={errors.commissionPct?.message} required hint="Ej: 10.5">
            <input {...register('commissionPct')} type="number" step="0.01" placeholder="10.5" className={inputClass(errors.commissionPct?.message)} />
          </FormField>

          <FormField label="Moneda" error={errors.currency?.message} required>
            <input {...register('currency')} placeholder="UYU" className={inputClass(errors.currency?.message)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Inicio del contrato" error={errors.startDate?.message} required>
            <input {...register('startDate')} type="date" className={inputClass(errors.startDate?.message)} />
          </FormField>

          <FormField label="Fin del contrato" hint="Opcional">
            <input {...register('endDate')} type="date" className={inputClass()} />
          </FormField>
        </div>

        <FormField label="Notas">
          <textarea {...register('notes')} rows={2} placeholder="Observaciones..." className={inputClass() + ' resize-none'} />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Crear contrato
          </button>
        </div>
      </form>
    </Modal>
  );
}
