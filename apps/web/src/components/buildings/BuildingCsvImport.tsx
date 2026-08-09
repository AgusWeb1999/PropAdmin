'use client';
import { useRef, useState } from 'react';
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

// ─── Tipos ───────────────────────────────────────────────────
interface CsvRow {
  name: string;
  address: string;
  city: string;
  department: string;
  totalUnits: number;
  currency: 'UYU' | 'USD';
  interestRate: number;   // porcentaje, ej: 3
  notes?: string;
  // estado de validación (no se envía a la API)
  _errors: string[];
}

// ─── Columnas requeridas del CSV ─────────────────────────────
const HEADERS = [
  'nombre', 'direccion', 'ciudad', 'barrio_zona',
  'total_unidades', 'moneda', 'tasa_interes',
];
const OPTIONAL_HEADERS = ['observaciones'];

// ─── Plantilla CSV ───────────────────────────────────────────
const TEMPLATE = [
  [...HEADERS, ...OPTIONAL_HEADERS].join(','),
  'Edificio Pocitos,Bulevar España 2500,Montevideo,Pocitos,12,UYU,3,',
  'Edificio Centro,18 de Julio 1000,Montevideo,Centro,8,UYU,3,',
  'Torres Palermo,Av Italia 3000,Montevideo,Palermo,20,USD,2,Edificio con amenities',
].join('\n');

// ─── Parser CSV simple ────────────────────────────────────────
function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const idx = (col: string) => header.indexOf(col);

  // Validar columnas requeridas
  const missingCols = HEADERS.filter(h => idx(h) === -1);
  if (missingCols.length > 0) {
    throw new Error(`Faltan columnas requeridas: ${missingCols.join(', ')}`);
  }

  return lines.slice(1).map((line, i) => {
    // Dividir respetando comillas
    const cells = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(c =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
    ) ?? line.split(',');

    const get = (col: string) => cells[idx(col)]?.trim() ?? '';
    const errors: string[] = [];

    const name      = get('nombre');
    const address   = get('direccion');
    const city      = get('ciudad');
    const department = get('barrio_zona');
    const unitsRaw  = get('total_unidades');
    const currency  = get('moneda').toUpperCase() as 'UYU' | 'USD';
    const rateRaw   = get('tasa_interes');
    const notes     = get('observaciones') || undefined;

    if (!name || name.length < 2)      errors.push('Nombre muy corto');
    if (!address || address.length < 5) errors.push('Dirección muy corta');
    if (!city || city.length < 2)      errors.push('Ciudad requerida');

    const totalUnits = parseInt(unitsRaw, 10);
    if (isNaN(totalUnits) || totalUnits < 1) errors.push('Total de unidades inválido');

    if (!['UYU', 'USD'].includes(currency)) errors.push('Moneda debe ser UYU o USD');

    const interestRate = parseFloat(rateRaw.replace(',', '.'));
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100)
      errors.push('Tasa de interés inválida (0–100)');

    return { name, address, city, department, totalUnits, currency, interestRate, notes, _errors: errors };
  });
}

// ─── Componente ───────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'done';

interface ImportResult { created: number; errors: Array<{ row: number; name: string; error: string }> }

export function BuildingCsvImport({ isOpen, onClose, onImported }: Props) {
  const toast  = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]     = useState<Step>('upload');
  const [rows, setRows]     = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting]   = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validRows   = rows.filter(r => r._errors.length === 0);
  const invalidRows = rows.filter(r => r._errors.length > 0);

  const handleFile = (file: File) => {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCsv(e.target?.result as string);
        if (parsed.length === 0) { setParseError('El archivo está vacío o solo tiene encabezados'); return; }
        setRows(parsed);
        setStep('preview');
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Error al leer el CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const payload = validRows.map(r => ({
        name:         r.name,
        address:      r.address,
        city:         r.city,
        department:   r.department || undefined,
        totalUnits:   r.totalUnits,
        currency:     r.currency,
        interestRate: r.interestRate / 100,   // convertir % a decimal para la API
        notes:        r.notes,
      }));
      const res = await api.post<ImportResult>('/buildings/bulk', payload);
      setResult(res);
      setStep('done');
      onImported();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload'); setRows([]); setParseError(null); setResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'plantilla_edificios.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar edificios desde CSV" size="lg">
      {/* ── Step: upload ─────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Subí un archivo CSV con los edificios. Descargá la plantilla para ver el formato exacto.
            </p>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0 ml-3">
              <Download className="w-3.5 h-3.5" /> Plantilla
            </button>
          </div>

          {/* Columnas requeridas */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">Columnas requeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              {HEADERS.map(h => (
                <code key={h} className="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs">{h}</code>
              ))}
            </div>
            <p className="font-semibold text-slate-700 mt-2 mb-1">Opcionales:</p>
            <div className="flex flex-wrap gap-1.5">
              {OPTIONAL_HEADERS.map(h => (
                <code key={h} className="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs">{h}</code>
              ))}
            </div>
            <p className="mt-2 text-slate-500">
              <strong>moneda:</strong> UYU o USD &nbsp;·&nbsp; <strong>tasa_interes:</strong> porcentaje (ej: 3) &nbsp;·&nbsp; <strong>total_unidades:</strong> número entero
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-all"
          >
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Arrastrá tu CSV aquí o hacé click</p>
            <p className="text-xs text-slate-400 mt-1">Solo archivos .csv</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {parseError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step: preview ────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              {validRows.length} válido{validRows.length !== 1 ? 's' : ''}
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-sm px-3 py-1.5 rounded-lg">
                <XCircle className="w-4 h-4" />
                {invalidRows.length} con error{invalidRows.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-80 rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#', 'Nombre', 'Dirección', 'Ciudad', 'Barrio/Zona', 'Unidades', 'Moneda', 'Tasa', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <tr key={i} className={cn('transition-colors', row._errors.length > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50')}>
                    <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{row.name || <span className="text-red-400 italic">vacío</span>}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{row.address}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.city}</td>
                    <td className="px-3 py-2 text-slate-500">{row.department || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-center">{row.totalUnits || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.currency}</td>
                    <td className="px-3 py-2 text-slate-600">{row.interestRate}%</td>
                    <td className="px-3 py-2">
                      {row._errors.length > 0 ? (
                        <span title={row._errors.join(' · ')}>
                          <XCircle className="w-4 h-4 text-red-400" />
                        </span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Errors detail */}
          {invalidRows.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-2">Filas con errores (se omitirán):</p>
              {invalidRows.map((row, i) => (
                <p key={i} className="text-xs text-red-600">
                  <strong>{row.name || `Fila ${rows.indexOf(row) + 1}`}:</strong> {row._errors.join(' · ')}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button onClick={() => { setStep('upload'); setRows([]); }}
              className="text-sm text-slate-500 hover:text-slate-900">
              ← Subir otro archivo
            </button>
            <button onClick={handleImport} disabled={importing || validRows.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors">
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Importar {validRows.length} edificio{validRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: done ───────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-900">
              {result.created} edificio{result.created !== 1 ? 's' : ''} importado{result.created !== 1 ? 's' : ''}
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 mb-1">{result.errors.length} fila{result.errors.length !== 1 ? 's' : ''} con error:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">Fila {e.row} — {e.name}: {e.error}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleClose}
              className="bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800">
              Listo
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
