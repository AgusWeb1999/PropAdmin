'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as Array<keyof typeof EXPENSE_CATEGORY_LABELS>;

const schema = z.object({
  category:      z.enum(['ELECTRICITY','WATER','CLEANING','ELEVATOR','MAINTENANCE','CONCIERGE','INSURANCE','ADMINISTRATION','RESERVE_FUND','OTHER']),
  description:   z.string().min(2, 'Descripción requerida'),
  amount:        z.coerce.number().positive('Monto debe ser mayor a 0'),
  period:        z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  invoiceNumber: z.string().optional(),
  notes:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  buildingId: string;
}

export function ExpenseForm({ isOpen, onClose, onCreated, buildingId }: Props) {
  const toast = useToast();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'ELECTRICITY', period: currentPeriod() },
  });

  const category = watch('category');

  // Auto-fill description when category changes
  const handleCategoryChange = (cat: string) => {
    setValue('category', cat as FormData['category']);
    setValue('description', EXPENSE_CATEGORY_LABELS[cat] || '');
  };

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/expenses/building/${buildingId}`, data);
      toast.success('Gasto registrado correctamente');
      reset({ category: 'ELECTRICITY', period: currentPeriod() });
      onClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar gasto');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo gasto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Categoría" error={errors.category?.message} required>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={inputClass()}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Período" error={errors.period?.message} required hint="Formato: 2024-01">
            <input {...register('period')} placeholder="2024-01" className={inputClass(errors.period?.message)} />
          </FormField>

          <div className="col-span-2">
            <FormField label="Descripción" error={errors.description?.message} required>
              <input {...register('description')} placeholder="Ej: Factura UTE mes enero" className={inputClass(errors.description?.message)} />
            </FormField>
          </div>

          <FormField label="Monto" error={errors.amount?.message} required>
            <input {...register('amount')} type="number" step="0.01" min={0} placeholder="12500" className={inputClass(errors.amount?.message)} />
          </FormField>

          <FormField label="N° de factura">
            <input {...register('invoiceNumber')} placeholder="000123" className={inputClass()} />
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
            type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Registrar gasto
          </button>
        </div>
      </form>
    </Modal>
  );
}
