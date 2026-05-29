'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Download, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DelinquentEntry {
  apartmentId: string;
  totalDebt: number;
  apartment: {
    number: string;
    floor: string | null;
    buildingId: string;
    building: { name: string };
    residents: Array<{
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      type: string;
    }>;
  };
  charges: Array<{
    id: string;
    description: string;
    period: string;
    amount: number;
    interestAmount: number;
    dueDate: string;
    status: string;
  }>;
}

export default function MorososPage() {
  const [delinquents, setDelinquents] = useState<DelinquentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<DelinquentEntry[]>('/payments/delinquents')
      .then(setDelinquents)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalDebt = delinquents.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <>
      <Header
        title="Morosos"
        subtitle={`${delinquents.length} apartamentos con deuda vencida`}
        actions={
          <button className="flex items-center gap-1.5 border border-gray-200 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-slate-700">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        }
      />

      <div className="p-6 animate-slide-up space-y-4">
        {/* Summary banner */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">Deuda total vencida</p>
            <p className="text-2xl font-bold text-red-700 tabular-nums">{formatCurrency(totalDebt)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-20 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : delinquents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Sin morosos</h3>
            <p className="text-sm text-slate-500">Todos los apartamentos están al día</p>
          </div>
        ) : (
          <div className="space-y-2">
            {delinquents.map((entry) => {
              const isOpen = expanded.has(entry.apartmentId);
              const resident = entry.apartment.residents[0];
              return (
                <div key={entry.apartmentId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Row header */}
                  <button
                    onClick={() => toggle(entry.apartmentId)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-700">{entry.apartment.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Apt {entry.apartment.number}
                          {entry.apartment.floor ? `, Piso ${entry.apartment.floor}` : ''}
                        </p>
                        <span className="text-xs text-slate-400">·</span>
                        <p className="text-xs text-slate-500 truncate">{entry.apartment.building.name}</p>
                      </div>
                      {resident && (
                        <p className="text-xs text-slate-500">{resident.firstName} {resident.lastName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-sm font-bold text-red-600 tabular-nums">{formatCurrency(entry.totalDebt)}</p>
                      <p className="text-xs text-slate-400">{entry.charges.length} cargo{entry.charges.length !== 1 ? 's' : ''}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-50 px-4 pb-4">
                      {/* Contact */}
                      {resident && (resident.phone || resident.email) && (
                        <div className="flex items-center gap-3 py-3">
                          {resident.phone && (
                            <a href={`tel:${resident.phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                              <Phone className="w-3.5 h-3.5" /> {resident.phone}
                            </a>
                          )}
                          {resident.email && (
                            <a href={`mailto:${resident.email}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                              <Mail className="w-3.5 h-3.5" /> {resident.email}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Charges table */}
                      <div className="rounded-xl overflow-hidden border border-gray-100">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Período</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Descripción</th>
                              <th className="text-right px-3 py-2 text-slate-500 font-medium">Capital</th>
                              <th className="text-right px-3 py-2 text-slate-500 font-medium">Interés</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Vence</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {entry.charges.map((charge) => (
                              <tr key={charge.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-slate-700">{charge.period}</td>
                                <td className="px-3 py-2 text-slate-600">{charge.description}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(charge.amount)}</td>
                                <td className={cn('px-3 py-2 text-right tabular-nums', charge.interestAmount > 0 ? 'text-red-600' : 'text-slate-400')}>
                                  {formatCurrency(charge.interestAmount)}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{formatDate(charge.dueDate)}</td>
                                <td className="px-3 py-2"><StatusBadge status={charge.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
