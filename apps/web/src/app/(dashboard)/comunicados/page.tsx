'use client';
import { useEffect, useState } from 'react';
import { Plus, Megaphone, Trash2, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Building { id: string; name: string }
interface Announcement {
  id: string; title: string; content: string; isImportant: boolean;
  publishedAt: string; expiresAt: string | null;
}

export default function ComunicadosPage() {
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isImportant: false, expiresAt: '' });

  useEffect(() => {
    api.get<Building[]>('/buildings').then(b => { setBuildings(b); if (b.length > 0) setBuildingId(b[0].id); });
  }, []);

  const load = () => {
    if (!buildingId) return;
    setLoading(true);
    api.get<Announcement[]>(`/announcements/building/${buildingId}`).then(setAnnouncements).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [buildingId]);

  const handleCreate = async () => {
    try {
      await api.post('/announcements', {
        buildingId,
        title: form.title,
        content: form.content,
        isImportant: form.isImportant,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      toast.success('Comunicado publicado');
      setShowForm(false);
      setForm({ title: '', content: '', isImportant: false, expiresAt: '' });
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminás este comunicado?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Comunicado eliminado');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <>
      <Header
        title="Comunicados"
        subtitle="Anuncios y avisos para residentes"
        actions={
          <div className="flex items-center gap-2">
            <select value={buildingId} onChange={e => setBuildingId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-slate-400">
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" /> Nuevo comunicado
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-slide-up">
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Nuevo comunicado</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Corte de agua programado" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Contenido *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4} placeholder="Escribí el mensaje para los residentes..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none" />
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Vence el (opcional)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={form.isImportant} onChange={e => setForm(f => ({ ...f, isImportant: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-700">Marcar como importante</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">Cancelar</button>
              <button onClick={handleCreate} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800">Publicar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <Megaphone className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-400">No hay comunicados publicados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className={cn(
                'bg-white rounded-2xl border p-5',
                a.isImportant ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {a.isImportant && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400">
                          {new Date(a.publishedAt).toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        {a.expiresAt && (
                          <span className="text-xs text-slate-400">
                            Vence: {new Date(a.expiresAt).toLocaleDateString('es-UY')}
                          </span>
                        )}
                        {a.isImportant && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Importante</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
