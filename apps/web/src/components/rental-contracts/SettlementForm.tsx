'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass } from '@/components/ui/FormField';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { formatPeriod } from '@/lib/utils';

interface Deduction { label: string; amount: string }
interface PastSettlement { period: string; deductionsDetail: Array<{ label: string; amount: number }> | null }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
  rentalContractId: string;
  defaultPeriod?: string; // "YYYY-MM"
}

export function SettlementForm({ isOpen, onClose, onGenerated, rentalContractId, defaultPeriod }: Props) {
  const toast = useToast();
  const [period, setPeriod] = useState(defaultPeriod ?? new Date().toISOString().slice(0, 7));
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [force, setForce] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Precarga las mismas deducciones del último período liquidado, para que
  // solo haga falta cambiar los montos en vez de volver a escribir todo.
  useEffect(() => {
    if (!isOpen) return;
    api.get<PastSettlement[]>(`/settlements/contract/${rentalContractId}`).then((settlements) => {
      const last = settlements[0];
      if (last?.deductionsDetail?.length) {
        setDeductions(last.deductionsDetail.map((d) => ({ label: d.label, amount: String(d.amount) })));
      }
    });
  }, [isOpen, rentalContractId]);

  const addDeduction = () => setDeductions((d) => [...d, { label: '', amount: '' }]);
  const removeDeduction = (i: number) => setDeductions((d) => d.filter((_, idx) => idx !== i));
  const updateDeduction = (i: number, field: keyof Deduction, value: string) =>
    setDeductions((d) => d.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const submit = async (forceValue = force) => {
    setSubmitting(true);
    try {
      await api.post('/settlements/generate', {
        rentalContractId,
        period,
        deductionsDetail: deductions
          .filter((d) => d.label.trim() && Number(d.amount) > 0)
          .map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })),
        force: forceValue,
      });
      toast.success('Liquidación generada correctamente');
      setDeductions([]);
      onClose();
      onGenerated();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'NOTHING_COLLECTED') {
        if (confirm('Todavía no se cobró nada de este período. ¿Liquidar igual en $0?')) {
          setForce(true);
          await submit(true);
          return;
        }
      } else {
        toast.error(e instanceof Error ? e.message : 'Error al generar la liquidación');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generar liquidación" size="md">
      <div className="space-y-4">
        <FormField label="Período" required hint={period ? formatPeriod(period) : undefined}>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass()} />
        </FormField>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Deducciones <span className="text-slate-400 font-normal">(impuestos u otros descuentos, opcional)</span>
          </p>
          <div className="space-y-2">
            {deductions.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={d.label}
                  onChange={(e) => updateDeduction(i, 'label', e.target.value)}
                  placeholder="Ej: Contribución"
                  className={inputClass() + ' flex-1'}
                />
                <input
                  value={d.amount}
                  onChange={(e) => updateDeduction(i, 'amount', e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className={inputClass() + ' w-32'}
                />
                <button
                  type="button"
                  onClick={() => removeDeduction(i)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addDeduction}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar deducción
          </button>
        </div>

        <p className="text-xs text-slate-400">
          El sistema calcula automáticamente lo cobrado del alquiler de este período, descuenta la comisión y las
          deducciones cargadas arriba, y genera el neto a transferir al propietario.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || !period}
            onClick={() => submit()}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Generar liquidación
          </button>
        </div>
      </div>
    </Modal>
  );
}
