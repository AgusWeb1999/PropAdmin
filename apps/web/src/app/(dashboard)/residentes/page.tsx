'use client';
import { useEffect, useState } from 'react';
import { Users, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface Building { id: string; name: string }
interface Resident {
  id: string; firstName: string; lastName: string; email: string | null;
  phone: string | null; type: string; isActive: boolean;
  apartment: { number: string; floor: string | null; building: { id: string; name: string } };
}

export default function ResidentesPage() {
  const toast = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Building[]>('/buildings').then(setBuildings);
  }, []);

  const load = () => {
    setLoading(true);
    const url = buildingFilter ? `/residents?buildingId=${buildingFilter}` : '/residents';
    api.get<Resident[]>(url)
      .then(setResidents)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [buildingFilter]);

  const handleDelete = async (r: Resident) => {
    if (!confirm(`¿Eliminás a ${r.firstName} ${r.lastName}?`)) return;
    try {
      await api.delete(`/residents/${r.id}`);
      toast.success('Residente eliminado');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
  };

  const filtered = residents.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.apartment.number.toLowerCase().includes(q);
  });

  return (
    <>
      <Header
        title="Residentes"
        subtitle="Todos los residentes de tus propiedades"
        actions={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-slate-400 w-48"
            />
            <select
              value={buildingFilter}
              onChange={e => setBuildingFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">Todas las propiedades</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        }
      />

      <div className="p-6 animate-slide-up">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Users className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay residentes registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Tipo', 'Apartamento', 'Propiedad', 'Teléfono', 'Email', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.type} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600">Apt {r.apartment.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.apartment.building.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-slate-500'}`}>
                        {r.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(r)}
                        title="Eliminar residente"
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3 px-1">{filtered.length} residente{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </>
  );
}
