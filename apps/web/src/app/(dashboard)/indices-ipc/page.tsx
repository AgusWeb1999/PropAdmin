'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface IpcIndex {
  id:    string;
  year:  number;
  month: number;
  value: number;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function IndicesIpcPage() {
  const toast = useToast();
  const [indexes, setIndexes]   = useState<IpcIndex[]>([]);
  const [loading, setLoading]   = useState(true);

  // Form
  const [year,    setYear]    = useState(currentYear);
  const [month,   setMonth]   = useState(currentMonth);
  const [value,   setValue]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<IpcIndex[]>('/ipc').then(setIndexes).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const parsed = parseFloat(value.replace(',', '.'));
    if (isNaN(parsed)) { toast.error('Ingresá un valor válido (ej: 0.82)'); return; }
    if (parsed < -100 || parsed > 100) { toast.error('El valor debe estar entre -100 y 100'); return; }

    setSaving(true);
    try {
      await api.post('/ipc', { year, month, value: parsed / 100 }); // guardamos como decimal
      toast.success(`IPC ${MONTHS[month - 1]} ${year} guardado`);
      setValue('');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminás este índice?')) return;
    setDeleting(id);
    try {
      await api.delete(`/ipc/${id}`);
      toast.success('Índice eliminado');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  // Agrupar por año para mostrar en tabla
  const years = Array.from(new Set(indexes.map(i => i.year))).sort((a, b) => b - a);

  return (
    <>
      <Header
        title="Índices IPC"
        subtitle="Variación mensual del Índice de Precios al Consumo (INE Uruguay)"
      />

      <div className="p-6 space-y-6 animate-slide-up max-w-3xl">

        {/* Info legal */}
        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p className="font-semibold">Ley de Propiedad Horizontal — Cálculo de intereses</p>
            <p>La deuda impaga se actualiza mes a mes por el IPC publicado por el INE, y luego se aplica el <strong>1% mensual</strong> sobre el monto actualizado.</p>
            <p className="text-blue-500">El valor a ingresar es la variación mensual en porcentaje (ej: si el INE publicó 0.82%, ingresás <strong>0.82</strong>).</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar / actualizar índice
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Mes</label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Año</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Variación IPC (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder="ej: 0.82"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <span className="text-sm text-slate-400">%</span>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !value}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {value && !isNaN(parseFloat(value.replace(',', '.'))) && (
            <p className="text-xs text-slate-400 mt-2">
              Guardará: {MONTHS[month - 1]} {year} = {parseFloat(value.replace(',', '.')).toFixed(2)}% ({(parseFloat(value.replace(',', '.')) / 100).toFixed(4)} decimal)
            </p>
          )}
        </div>

        {/* Tabla de índices */}
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
          </div>
        ) : indexes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Sin índices cargados</p>
            <p className="text-xs text-slate-400 mt-1">
              Agregá el IPC mensual publicado por el INE para que el sistema calcule los intereses correctamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {years.map(y => {
              const yearIndexes = indexes.filter(i => i.year === y).sort((a, b) => b.month - a.month);
              return (
                <div key={y} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-sm font-semibold text-slate-700">{y}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {yearIndexes.map(idx => (
                      <div key={idx.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-700 w-10">{MONTHS[idx.month - 1]}</span>
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            idx.value > 0 ? 'text-rose-600' : idx.value < 0 ? 'text-emerald-600' : 'text-slate-400'
                          )}>
                            {idx.value >= 0 ? '+' : ''}{(idx.value * 100).toFixed(2)}%
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">({idx.value.toFixed(4)})</span>
                        </div>
                        <button
                          onClick={() => handleDelete(idx.id)}
                          disabled={deleting === idx.id}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
