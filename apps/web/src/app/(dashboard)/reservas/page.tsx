'use client';
import { useEffect, useState } from 'react';
import { Plus, Calendar, Receipt, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn, formatCurrency } from '@/lib/utils';

interface Building { id: string; name: string; currency: string }
interface CommonArea { id: string; name: string; icon: string | null; pricePerUse: number }
interface Reservation {
  id: string;
  status: string;
  startDateTime: string;
  endDateTime: string;
  totalCost: number;
  notes: string | null;
  chargeId: string | null;
  commonArea: { id: string; name: string; icon: string | null; pricePerUse: number };
  resident: { id: string; firstName: string; lastName: string; apartment: { id: string; number: string } };
  charge: { id: string; status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-100',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  CANCELLED: 'bg-red-50 text-red-500 border border-red-100',
  COMPLETED: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada',
};

export default function ReservasPage() {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [currency, setCurrency] = useState('UYU');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [residents, setResidents] = useState<Array<{ id: string; firstName: string; lastName: string; apartment: { number: string } }>>([]);
  const [form, setForm] = useState({
    commonAreaId: '', residentId: '', date: '', startTime: '09:00', endTime: '11:00', notes: '',
  });

  useEffect(() => {
    api.get<Building[]>('/buildings').then(b => {
      setBuildings(b);
      if (b.length > 0) { setBuildingId(b[0].id); setCurrency(b[0].currency); }
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
      const cur = buildings.find(b => b.id === buildingId)?.currency ?? 'UYU';
      setCurrency(cur);
      api.get<CommonArea[]>(`/common-areas/building/${buildingId}`)
        .then(setCommonAreas)
        .catch(() => setCommonAreas([]));
      api.get<Array<{ id: string; firstName: string; lastName: string; isActive: boolean; apartment: { number: string } }>>(
        `/residents?buildingId=${buildingId}`
      ).then(r => setResidents(r.filter(x => x.isActive)));
    }
  }, [buildingId]);

  const selectedArea = commonAreas.find(a => a.id === form.commonAreaId);

  const handleStatusChange = async (resId: string, status: 'CONFIRMED' | 'CANCELLED') => {
    try {
      await api.patch(`/reservations/${resId}/status`, { status });
      const label = status === 'CONFIRMED' ? 'confirmada' : 'cancelada';
      const extra = status === 'CONFIRMED' && (reservations.find(r => r.id === resId)?.totalCost ?? 0) > 0
        ? ' — se generó el cargo al apartamento' : '';
      toast.success(`Reserva ${label}${extra}`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDelete = async (resId: string) => {
    if (!confirm('¿Eliminás esta reserva?')) return;
    try {
      await api.delete(`/reservations/${resId}`);
      toast.success('Reserva eliminada');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreate = async () => {
    if (!form.date || !form.commonAreaId || !form.residentId) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }
    try {
      const startDateTime = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endDateTime   = new Date(`${form.date}T${form.endTime}:00`).toISOString();
      await api.post('/reservations', {
        buildingId, commonAreaId: form.commonAreaId, residentId: form.residentId,
        startDateTime, endDateTime, notes: form.notes || undefined,
      });
      toast.success('Reserva creada');
      setShowForm(false);
      setForm({ commonAreaId: '', residentId: '', date: '', startTime: '09:00', endTime: '11:00', notes: '' });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear reserva');
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-UY', {
    weekday: 'short', day: '2-digit', month: 'short',
  });

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
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Nueva reserva</h3>

            {/* Amenity selector */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Espacio *</label>
              {commonAreas.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Este edificio no tiene amenidades configuradas. Andá a Edificios → Amenidades.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {commonAreas.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => setForm(f => ({ ...f, commonAreaId: a.id }))}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                        form.commonAreaId === a.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-gray-200 hover:border-slate-400 text-slate-700'
                      )}
                    >
                      {a.icon && <span>{a.icon}</span>}
                      <span>{a.name}</span>
                      {Number(a.pricePerUse) > 0 && (
                        <span className={cn('text-xs', form.commonAreaId === a.id ? 'text-slate-300' : 'text-slate-400')}>
                          {formatCurrency(Number(a.pricePerUse), currency)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedArea && Number(selectedArea.pricePerUse) > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  Al confirmar esta reserva se generará automáticamente un cargo de{' '}
                  <strong>{formatCurrency(Number(selectedArea.pricePerUse), currency)}</strong> al apartamento del residente.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Residente *</label>
                <select value={form.residentId} onChange={e => setForm(f => ({ ...f, residentId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  <option value="">Seleccioná...</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName} — Apt {r.apartment.number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hora inicio</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hora fin</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notas (opcional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ej: Cumpleaños, 8 personas" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">Cancelar</button>
              <button onClick={handleCreate} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800">Guardar</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Calendar className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay reservas para este edificio</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Espacio', 'Residente / Apto', 'Fecha', 'Horario', 'Costo', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {r.commonArea.icon && <span className="mr-1">{r.commonArea.icon}</span>}
                        {r.commonArea.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{r.resident.firstName} {r.resident.lastName}</p>
                      <p className="text-xs text-slate-400">Apt {r.resident.apartment.number}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(r.startDateTime)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(r.startDateTime).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(r.endDateTime).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {Number(r.totalCost) === 0 ? (
                        <span className="text-xs text-emerald-600">Gratis</span>
                      ) : (
                        <div>
                          <span className="text-sm font-medium text-slate-900">{formatCurrency(Number(r.totalCost), currency)}</span>
                          {r.charge && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Receipt className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-400">Cargo {r.charge.status === 'PAID' ? 'pagado' : 'pendiente'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[r.status])}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {r.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleStatusChange(r.id, 'CONFIRMED')}
                              className="text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md font-medium">
                              Confirmar
                            </button>
                            <button onClick={() => handleStatusChange(r.id, 'CANCELLED')}
                              className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md">
                              Cancelar
                            </button>
                          </>
                        )}
                        {r.status === 'PENDING' && (
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
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
    </>
  );
}
