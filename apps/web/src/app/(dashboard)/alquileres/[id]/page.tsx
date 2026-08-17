'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Plus, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SettlementForm } from '@/components/rental-contracts/SettlementForm';
import { api } from '@/lib/api';
import { formatCurrency, formatPeriod, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface Charge {
  id: string; description: string; period: string; amount: number;
  paidAmount: number; status: string; dueDate: string;
}
interface Settlement {
  id: string; period: string; rentCollected: number; commissionAmount: number;
  netToOwner: number; status: string; transferredAt: string | null;
}
interface Contract {
  id: string; rentAmount: number; commissionPct: number; currency: string; status: string;
  startDate: string; endDate: string | null; notes: string | null;
  apartment: { number: string; floor: string | null; building: { id: string; name: string; currency: string } };
  ownerResident: { firstName: string; lastName: string; email: string | null; phone: string | null };
  tenantResident: { firstName: string; lastName: string; email: string | null; phone: string | null };
  charges: Charge[];
  settlements: Settlement[];
}

export default function RentalContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generatingCharge, setGeneratingCharge] = useState(false);
  const [settlementFormOpen, setSettlementFormOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Contract>(`/rental-contracts/${id}`)
      .then(setContract)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const generateCharge = async () => {
    if (!contract) return;
    const period = new Date().toISOString().slice(0, 7);
    const dueDate = new Date();
    dueDate.setDate(10);
    setGeneratingCharge(true);
    try {
      await api.post(`/rental-contracts/${contract.id}/generate-charge`, {
        period,
        dueDate: dueDate.toISOString(),
      });
      toast.success('Cargo de alquiler generado');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al generar el cargo');
    } finally {
      setGeneratingCharge(false);
    }
  };

  const downloadSettlementPdf = async (settlementId: string) => {
    setDownloadingId(settlementId);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/settlements/${settlementId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquidacion_${contract?.apartment.number}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar el PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const markTransferred = async (settlementId: string) => {
    if (!confirm('¿Confirmás que ya transferiste el neto al propietario?')) return;
    setTransferringId(settlementId);
    try {
      await api.patch(`/settlements/${settlementId}/transfer`, {});
      toast.success('Liquidación marcada como transferida');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al marcar la transferencia');
    } finally {
      setTransferringId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">Contrato no encontrado</h2>
          <p className="text-sm text-slate-400">El contrato que buscás no existe o fue eliminado.</p>
        </div>
        <button
          onClick={() => router.push('/alquileres')}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a alquileres
        </button>
      </div>
    );
  }

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const currentPeriodCharge = contract.charges.find((c) => c.period === currentPeriod);

  return (
    <>
      <Header
        title={`Apto ${contract.apartment.number} — ${contract.apartment.building.name}`}
        subtitle={`${contract.ownerResident.firstName} ${contract.ownerResident.lastName} (propietario) · ${contract.tenantResident.firstName} ${contract.tenantResident.lastName} (inquilino)`}
        actions={
          <button
            onClick={generateCharge}
            disabled={generatingCharge || !!currentPeriodCharge || contract.status !== 'ACTIVE'}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {generatingCharge ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {currentPeriodCharge ? 'Cargo del mes ya generado' : 'Generar cargo del mes'}
          </button>
        }
      />

      <div className="p-6 space-y-5 animate-slide-up">
        <Link href="/alquileres" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a alquileres
        </Link>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Alquiler mensual', value: formatCurrency(contract.rentAmount, contract.currency) },
            { label: 'Comisión', value: `${(Number(contract.commissionPct) * 100).toFixed(2)}%` },
            { label: 'Inicio', value: formatDate(contract.startDate) },
            { label: 'Estado', value: null, badge: contract.status },
          ].map(({ label, value, badge }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              {badge ? <StatusBadge status={badge} /> : <p className="text-lg font-bold text-slate-900 truncate">{value}</p>}
            </div>
          ))}
        </div>

        {/* Charges */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Cargos de alquiler</h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {contract.charges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-slate-400">Todavía no se generó ningún cargo</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Período', 'Vencimiento', 'Monto', 'Cobrado', 'Estado'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contract.charges.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatPeriod(c.period)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(c.dueDate)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(c.amount, contract.currency)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(c.paidAmount, contract.currency)}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Settlements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">Liquidaciones al propietario</h3>
            <button
              onClick={() => setSettlementFormOpen(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Generar liquidación
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {contract.settlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-slate-400">Todavía no se generó ninguna liquidación</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Período', 'Cobrado', 'Comisión', 'Neto al propietario', 'Estado', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contract.settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatPeriod(s.period)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(s.rentCollected, contract.currency)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(s.commissionAmount, contract.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(s.netToOwner, contract.currency)}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadSettlementPdf(s.id)}
                            disabled={downloadingId === s.id}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60"
                            title="Descargar PDF"
                          >
                            {downloadingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                          {s.status !== 'TRANSFERRED' && (
                            <button
                              onClick={() => markTransferred(s.id)}
                              disabled={transferringId === s.id}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-60"
                              title="Marcar como transferido"
                            >
                              {transferringId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <SettlementForm
        isOpen={settlementFormOpen}
        onClose={() => setSettlementFormOpen(false)}
        onGenerated={load}
        rentalContractId={contract.id}
      />
    </>
  );
}
