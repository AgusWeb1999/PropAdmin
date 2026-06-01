'use client';
import { useEffect, useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Building { id: string; name: string; commonAreas?: CommonArea[] }
interface CommonArea { id: string; name: string }
interface Reservation {
  id: string; status: string; startDateTime: string; endDateTime: string; notes: string | null;
  commonArea: { name: string };
  resident: { firstName: string; lastName: string; apartment: { number: string } };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada',
};

export default function ReservasPage() {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [form, setForm] = useState({ commonAreaId: '', residentId: '', startDateTime: '', endDateTime: '', notes: '' });
  const [residents, setResidents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    api.get<Building[]>('/buildings').then(b => {
      setBuildings(b);
      if (b.length > 0) setBuildingId(b[0].id);
    });
  }, []);

  const load = () => {
    if (!buildingId) return;
    setLoading(true);
    api.get<Reservation[]>(`/reservations/building/${buildingId}`)
      .then(setReservations)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (buildingId) {
      api.get<{ commonAreas: CommonArea[] }>(`/buildings/${buildingId}`)
        .then(b => setCommonAreas(b.commonAreas ?? []));
      api.get<Array<{ id: string; firstName: string; lastName: string }>>(`/residents?buildingId=${buildingId}`)
        .then(r => setResidents(r.filter((x: any) => x.isActive)));
    }
  }, [buildingId]);

  const handleStatusChange = async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success(`Reserva ${status === 'CONFIRMED' ? 'confirmada' : 'cancelada'}`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/reservations', { buildingId, ...form });
      toast.success('Reserva creada');
      setShowForm(false);
      setForm({ commonAreaId: '', residentId: '', startDateTime: '', endDateTime: '', notes: '' });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear reserva');
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Header
        title="Reservas"
        subtitle="Gestión de espacios comunes"
        actions={
          <div className="flex items-center gap-2">
            <select value={buildingId} onChange={e => setBuildingId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-slate-400">
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" /> Nueva reserva
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-slide-up">
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Nueva reserva</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Espacio común</label>
                <select value={form.commonAreaId} onChange={e => setForm(f => ({ ...f, commonAreaId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  <option value="">Seleccioná...</option>
                  {commonAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Residente</label>
                <select value={form.residentId} onChange={e => setForm(f => ({ ...f, residentId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  <option value="">Seleccioná...</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Inicio</label>
                <input type="datetime-local" value={form.startDateTime} onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fin</label>
                <input type="datetime-local" value={form.endDateTime} onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notas</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">Cancelar</button>
              <button onClick={handleCreate} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800">Guardar</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Calendar className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay reservas registradas</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Espacio', 'Residente', 'Apto', 'Inicio', 'Fin', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.commonArea.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.resident.firstName} {r.resident.lastName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">Apt {r.resident.apartment.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmt(r.startDateTime)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmt(r.endDateTime)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[r.status])}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatusChange(r.id, 'CONFIRMED')}
                            className="text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md">Confirmar</button>
                          <button onClick={() => handleStatusChange(r.id, 'CANCELLED')}
                            className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md">Cancelar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
