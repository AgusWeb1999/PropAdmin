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
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';

const schema = z.object({
  buildingId: z.string().min(1, 'Seleccioná un edificio'),
  apartmentId: z.string().min(1, 'Seleccioná un apartamento'),
  residentId: z.string().min(1, 'Seleccioná un residente'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'ONLINE', 'OTHER']),
  reference: z.string().optional(),
  date: z.string().min(1, 'Fecha requerida'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Building { id: string; name: string }
interface Apartment { id: string; number: string; floor: string | null }
interface Resident { id: string; firstName: string; lastName: string; type: string }
interface Charge { id: string; description: string; period: string; amount: number; interestAmount: number; status: string; dueDate: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function PaymentForm({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: 'CASH',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const buildingId = watch('buildingId');
  const apartmentId = watch('apartmentId');
  const residentId = watch('residentId');

  // Load buildings
  useEffect(() => {
    if (!isOpen) return;
    api.get<Building[]>('/buildings').then(setBuildings);
  }, [isOpen]);

  // Load apartments when building changes
  useEffect(() => {
    if (!buildingId) return;
    setValue('apartmentId', '');
    setValue('residentId', '');
    setResidents([]);
    setCharges([]);
    api.get<Apartment[]>(`/apartments/building/${buildingId}`).then(setApartments);
  }, [buildingId, setValue]);

  // Load residents when apartment changes
  useEffect(() => {
    if (!apartmentId) return;
    setValue('residentId', '');
    setCharges([]);
    api.get<Resident[]>(`/residents/apartment/${apartmentId}`).then((data) =>
      setResidents(data.filter((r: Resident & { isActive: boolean }) => r.isActive))
    );
  }, [apartmentId, setValue]);

  // Load charges when resident changes
  useEffect(() => {
    if (!residentId) return;
    api.get<{ apartment: { charges: Charge[] } }>(`/residents/${residentId}/debt`)
      .then((data) => setCharges(data.apartment?.charges ?? []));
  }, [residentId]);

  const toggleCharge = (id: string) => {
    setSelectedCharges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectedTotal = charges
    .filter((c) => selectedCharges.includes(c.id))
    .reduce((sum, c) => sum + Number(c.amount) + Number(c.interestAmount), 0);

  // Cuando cambia el total seleccionado, actualiza el campo monto (editable igual)
  useEffect(() => {
    if (selectedTotal > 0) setValue('amount', selectedTotal);
  }, [selectedTotal, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/payments', {
        residentId: data.residentId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        date: new Date(data.date).toISOString(),
        notes: data.notes,
        chargeIds: selectedCharges,
      });
      toast.success('Pago registrado correctamente');
      reset();
      setSelectedCharges([]);
      setCharges([]);
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar pago');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Step 1: Select building / apartment / resident */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Edificio" error={errors.buildingId?.message} required>
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

          <FormField label="Residente" error={errors.residentId?.message} required>
            <select {...register('residentId')} disabled={!apartmentId} className={inputClass(errors.residentId?.message)}>
              <option value="">Seleccionar...</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Pending charges */}
        {charges.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Cargos pendientes <span className="text-slate-400 font-normal">(seleccioná los que paga)</span>
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {charges.filter((c) => c.status !== 'PAID').map((charge) => {
                const total = Number(charge.amount) + Number(charge.interestAmount);
                const selected = selectedCharges.includes(charge.id);
                return (
                  <label key={charge.id} className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                    selected ? 'bg-slate-50' : 'hover:bg-gray-50'
                  )}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCharge(charge.id)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{charge.description}</p>
                      <p className="text-xs text-slate-400">{charge.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(total)}</p>
                      {Number(charge.interestAmount) > 0 && (
                        <p className="text-xs text-red-400">+{formatCurrency(charge.interestAmount)} interés</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedCharges.length > 0 && (
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-xs text-slate-500">{selectedCharges.length} cargo(s) seleccionado(s)</p>
                <p className="text-sm font-bold text-slate-900">Total: {formatCurrency(selectedTotal)}</p>
              </div>
            )}
          </div>
        )}

        {/* Payment details */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Monto"
            error={errors.amount?.message}
            required
            hint={selectedTotal > 0 ? 'Auto-completado por cargos seleccionados — podés editarlo' : undefined}
          >
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0"
              className={inputClass(errors.amount?.message)}
            />
          </FormField>

          <FormField label="Método de pago" error={errors.method?.message} required>
            <select {...register('method')} className={inputClass()}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Fecha de pago" error={errors.date?.message} required>
            <input {...register('date')} type="date" className={inputClass(errors.date?.message)} />
          </FormField>

          <FormField label="Referencia / Comprobante">
            <input {...register('reference')} placeholder="N° transferencia, cheque..." className={inputClass()} />
          </FormField>

          <div className="col-span-2">
            <FormField label="Notas">
              <textarea {...register('notes')} rows={2} placeholder="Observaciones..." className={inputClass() + ' resize-none'} />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="submit" disabled={isSubmitting || !residentId}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Registrar pago
          </button>
        </div>
      </form>
    </Modal>
  );
}
