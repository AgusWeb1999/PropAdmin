'use client';
import { useEffect, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Building { id: string; name: string }
interface Task {
  id: string; title: string; description: string | null; category: string;
  priority: string; status: string; assignedTo: string | null;
  scheduledDate: string | null; cost: number | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700', URGENT: 'bg-red-50 text-red-700',
};
const PRIORITY_LABELS: Record<string, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' };
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700', IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-gray-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', IN_PROGRESS: 'En progreso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
};
const CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICAL: 'Electricidad', STRUCTURAL: 'Estructural',
  CLEANING: 'Limpieza', ELEVATOR: 'Ascensor', SECURITY: 'Seguridad', GARDEN: 'Jardín', OTHER: 'Otro',
};

export default function MantenimientoPage() {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'OTHER', priority: 'MEDIUM', assignedTo: '', scheduledDate: '', cost: '' });

  useEffect(() => {
    api.get<Building[]>('/buildings').then(b => { setBuildings(b); if (b.length > 0) setBuildingId(b[0].id); });
  }, []);

  const load = () => {
    if (!buildingId) return;
    setLoading(true);
    api.get<Task[]>(`/maintenance/building/${buildingId}`).then(setTasks).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [buildingId]);

  const handleCreate = async () => {
    try {
      await api.post('/maintenance', {
        buildingId,
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
      });
      toast.success('Tarea creada');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'OTHER', priority: 'MEDIUM', assignedTo: '', scheduledDate: '', cost: '' });
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/maintenance/${id}/status`, { status });
      toast.success('Estado actualizado');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <>
      <Header
        title="Mantenimiento"
        subtitle="Tareas y órdenes de trabajo"
        actions={
          <div className="flex items-center gap-2">
            <select value={buildingId} onChange={e => setBuildingId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-slate-400">
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" /> Nueva tarea
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-slide-up">
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Nueva tarea</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Reparar gotera en techo..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prioridad</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Responsable</label>
                <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  placeholder="Nombre o empresa" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha programada</label>
                <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Costo estimado</label>
                <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Detalles..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none" />
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
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Wrench className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay tareas de mantenimiento</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tarea', 'Categoría', 'Prioridad', 'Responsable', 'Fecha', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{t.title}</p>
                      {t.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{CATEGORY_LABELS[t.category] ?? t.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PRIORITY_COLORS[t.priority])}>
                        {PRIORITY_LABELS[t.priority] ?? t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.assignedTo ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString('es-UY') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[t.status])}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        onChange={e => handleStatus(t.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none"
                      >
                        <option value="PENDING">Pendiente</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="COMPLETED">Completada</option>
                        <option value="CANCELLED">Cancelada</option>
                      </select>
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
