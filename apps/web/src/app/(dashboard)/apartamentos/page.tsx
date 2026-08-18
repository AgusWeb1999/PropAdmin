'use client';
import { useEffect, useState } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AccountStatement } from '@/components/apartments/AccountStatement';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface Building { id: string; name: string }
interface Apartment {
  id: string; number: string; floor: string | null; status: string;
  building: { id: string; name: string; currency: string };
  residents: Array<{ id: string; firstName: string; lastName: string; type: string }>;
  charges: Array<{ amount: string; interestAmount: string; paidAmount: string }>;
}

export default function ApartamentosPage() {
  const toast = useToast();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [statementApt, setStatementApt] = useState<Apartment | null>(null);

  useEffect(() => {
    api.get<Building[]>('/buildings').then(setBuildings);
  }, []);

  const load = () => {
    setLoading(true);
    const url = buildingFilter ? `/apartments?buildingId=${buildingFilter}` : '/apartments';
    api.get<Apartment[]>(url)
      .then(setApartments)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [buildingFilter]);

  const handleDelete = async (apt: Apartment) => {
    if (!confirm(`¿Eliminás el apartamento ${apt.number} (${apt.building.name})?`)) return;
    try {
      await api.delete(`/apartments/${apt.id}`);
      toast.success('Apartamento eliminado');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
  };

  return (
    <>
      <Header
        title="Apartamentos"
        subtitle="Todos los apartamentos de tus propiedades"
        actions={
          <select
            value={buildingFilter}
            onChange={e => setBuildingFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">Todas las propiedades</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        }
      />

      <div className="p-6 animate-slide-up">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : apartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Home className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay apartamentos registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Apt', 'Piso', 'Propiedad', 'Residente', 'Estado', 'Deuda', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {apartments.map(apt => {
                  const resident = apt.residents[0];
                  const debt = apt.charges.reduce((s, c) => s + Number(c.amount) + Number(c.interestAmount) - Number(c.paidAmount), 0);
                  return (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{apt.number}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{apt.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{apt.building.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {resident
                          ? <span>{resident.firstName} {resident.lastName} <StatusBadge status={resident.type} className="ml-1" /></span>
                          : <span className="text-slate-400 italic">Sin residente</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                      <td className="px-4 py-3">
                        {debt > 0
                          ? <span className="text-sm font-semibold text-red-600">{formatCurrency(debt, apt.building.currency)}</span>
                          : <span className="text-sm text-emerald-600">Al día</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setStatementApt(apt)}
                            className="text-xs text-slate-500 hover:text-slate-900 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                          >
                            Estado
                          </button>
                          <button
                            onClick={() => handleDelete(apt)}
                            title="Eliminar apartamento"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {statementApt && (
        <AccountStatement
          apartmentId={statementApt.id}
          aptNumber={statementApt.number}
          onClose={() => setStatementApt(null)}
        />
      )}
    </>
  );
}
