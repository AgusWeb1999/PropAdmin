'use client';
import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Trash2, Download } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface Building { id: string; name: string }
interface Document {
  id: string; name: string; description: string | null; category: string;
  fileUrl: string; fileSize: number; mimeType: string; isPublic: boolean;
  createdAt: string; building?: { name: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  REGULATION: 'Reglamento', MEETING_MINUTES: 'Acta', CONTRACT: 'Contrato',
  INVOICE: 'Factura', CERTIFICATE: 'Certificado', OTHER: 'Otro',
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function DocumentosPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'OTHER', buildingId: '', isPublic: false });

  useEffect(() => { api.get<Building[]>('/buildings').then(setBuildings); }, []);

  const load = () => {
    setLoading(true);
    const url = buildingFilter ? `/documents?buildingId=${buildingFilter}` : '/documents';
    api.get<Document[]>(url).then(setDocuments).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [buildingFilter]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !form.name) { toast.error('Completá el nombre y seleccioná un archivo'); return; }
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', form.name);
      if (form.description) fd.append('description', form.description);
      fd.append('category', form.category);
      if (form.buildingId) fd.append('buildingId', form.buildingId);
      fd.append('isPublic', String(form.isPublic));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Error al subir el archivo');
      toast.success('Documento subido');
      setShowForm(false);
      setForm({ name: '', description: '', category: 'OTHER', buildingId: '', isPublic: false });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminás este documento?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Documento eliminado');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <>
      <Header
        title="Documentos"
        subtitle="Archivos y documentación de la propiedad"
        actions={
          <div className="flex items-center gap-2">
            <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-slate-400">
              <option value="">Todas las propiedades</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800">
              <Upload className="w-3.5 h-3.5" /> Subir documento
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-slide-up">
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Subir documento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Reglamento interno 2024" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Propiedad (opcional)</label>
                <select value={form.buildingId} onChange={e => setForm(f => ({ ...f, buildingId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  <option value="">General (todos)</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Archivo *</label>
                <input ref={fileRef} type="file" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 file:mr-3 file:text-xs file:font-medium file:bg-slate-900 file:text-white file:border-0 file:rounded file:px-2 file:py-1" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">Cancelar</button>
              <button onClick={handleUpload} disabled={uploading}
                className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60">
                {uploading ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">No hay documentos subidos</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Categoría', 'Propiedad', 'Tamaño', 'Fecha', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{d.name}</p>
                          {d.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{d.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{d.building?.name ?? 'General'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmtSize(d.fileSize)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString('es-UY')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}${d.fileUrl}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDelete(d.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
