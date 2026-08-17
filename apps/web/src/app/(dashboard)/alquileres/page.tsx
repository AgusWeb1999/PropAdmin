'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RentalContractForm } from '@/components/rental-contracts/RentalContractForm';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Contract {
  id: string;
  rentAmount: number;
  commissionPct: number;
  currency: string;
  status: string;
  apartment: { number: string; floor: string | null; building: { id: string; name: string } };
  ownerResident: { firstName: string; lastName: string };
  tenantResident: { firstName: string; lastName: string };
}

export default function AlquileresPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Contract[]>('/rental-contracts').then(setContracts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Header
        title="Alquileres"
        subtitle={`${contracts.length} contrato${contracts.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo contrato
          </button>
        }
      />

      <div className="p-6 animate-slide-up">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <KeyRound className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-semibold text-slate-900">Sin contratos de alquiler</p>
              <p className="text-sm text-slate-400">Creá el primero para empezar a liquidar propietarios</p>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 mt-1"
              >
                Nuevo contrato
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Propiedad', 'Apto', 'Propietario', 'Inquilino', 'Alquiler', 'Comisión', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/alquileres/${c.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-slate-600">{c.apartment.building.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.apartment.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.ownerResident.firstName} {c.ownerResident.lastName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.tenantResident.firstName} {c.tenantResident.lastName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(c.rentAmount, c.currency)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(Number(c.commissionPct) * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RentalContractForm isOpen={formOpen} onClose={() => setFormOpen(false)} onCreated={load} />
    </>
  );
}
