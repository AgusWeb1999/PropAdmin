'use client';
import { useEffect, useState } from 'react';
import { Plus, CreditCard, Download } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Building { id: string; name: string }
interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
  notes: string | null;
  resident: {
    firstName: string;
    lastName: string;
    apartment: { number: string };
  };
}

export default function PagosPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get<Building[]>('/buildings').then((data) => {
      setBuildings(data);
      if (data.length > 0) setSelectedBuilding(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;
    setLoading(true);
    api.get<Payment[]>(`/payments/building/${selectedBuilding}`)
      .then(setPayments)
      .finally(() => setLoading(false));
  }, [selectedBuilding]);

  const totalMonth = payments
    .filter((p) => new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <>
      <Header
        title="Pagos"
        subtitle="Registro de cobros y recibos"
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 border border-gray-200 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-slate-700">
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar pago
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 animate-slide-up">
        {/* Building filter */}
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-slate-500">Recaudado este mes</p>
            <p className="text-xl font-bold text-emerald-600 tabular-nums mt-1">{formatCurrency(totalMonth)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-slate-500">Total pagos</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{payments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-slate-500">Promedio por pago</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
              {payments.length > 0
                ? formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0) / payments.length)
                : '—'}
            </p>
          </div>
        </div>

        {/* Payments table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Sin pagos registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Residente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apartamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {payment.resident.firstName} {payment.resident.lastName}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-slate-400">Ref: {payment.reference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Apt {payment.resident.apartment.number}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/v1/payments/${payment.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-900"
                      >
                        Recibo
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <PaymentForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => {
          if (selectedBuilding) {
            api.get<Payment[]>(`/payments/building/${selectedBuilding}`).then(setPayments);
          }
        }}
      />
    </>
  );
}
