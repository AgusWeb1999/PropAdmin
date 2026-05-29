'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, X, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Charge {
  id: string;
  description: string;
  period: string;
  amount: string;
  interestAmount: string;
  status: 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'PAID';
  dueDate: string;
}

interface StatementData {
  id: string;
  number: string;
  building: { name: string; currency: string };
  residents: Array<{ firstName: string; lastName: string }>;
  charges: Charge[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING:  'Pendiente',
  OVERDUE:  'Vencido',
  PARTIAL:  'Parcial',
  PAID:     'Pagado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  OVERDUE: 'bg-red-50 text-red-700',
  PARTIAL: 'bg-orange-50 text-orange-700',
  PAID:    'bg-emerald-50 text-emerald-700',
};

export function AccountStatement({ apartmentId, aptNumber, onClose }: {
  apartmentId: string;
  aptNumber: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StatementData>(`/apartments/${apartmentId}/statement`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [apartmentId]);

  const resident = data?.residents[0];
  const currency = data?.building.currency ?? 'UYU';

  const pendingCharges = data?.charges.filter(c => c.status !== 'PAID') ?? [];
  const totalDebt = pendingCharges.reduce(
    (sum, c) => sum + Number(c.amount) + Number(c.interestAmount), 0
  );
  const totalPaid = (data?.charges.filter(c => c.status === 'PAID') ?? [])
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <Modal isOpen onClose={onClose} title={`Estado de cuenta — Apt ${aptNumber}`}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
      ) : (
        <div className="space-y-4">
          {/* Resident + building info */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Residente</p>
              <p className="text-sm font-semibold text-slate-900">
                {resident ? `${resident.firstName} ${resident.lastName}` : 'Sin residente'}
              </p>
              <p className="text-xs text-slate-400">{data.building.name} · Apt {aptNumber}</p>
            </div>
            <a
              href={`/api/v1/apartments/${apartmentId}/statement`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </a>
          </div>

          {/* Summary pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-red-500 mb-1">Saldo pendiente</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">
                {formatCurrency(totalDebt, currency)}
              </p>
              <p className="text-xs text-red-400">{pendingCharges.length} cargo{pendingCharges.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-600 mb-1">Total abonado</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">
                {formatCurrency(totalPaid, currency)}
              </p>
              <p className="text-xs text-emerald-400">histórico</p>
            </div>
          </div>

          {/* Charges list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden max-h-64 overflow-y-auto">
            {data.charges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <TrendingUp className="w-8 h-8 text-slate-200" />
                <p className="text-sm text-slate-400">Sin cargos registrados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Período</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Descripción</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Importe</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Interés</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.charges.map((charge) => (
                    <tr key={charge.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{charge.period}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[120px] truncate">{charge.description}</td>
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums text-slate-900">
                        {formatCurrency(Number(charge.amount), currency)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums text-red-500">
                        {Number(charge.interestAmount) > 0
                          ? formatCurrency(Number(charge.interestAmount), currency)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[charge.status])}>
                          {STATUS_LABELS[charge.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
