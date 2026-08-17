'use client';
import { useRef, useState } from 'react';
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

// ─── Tipos ───────────────────────────────────────────────────
interface CsvRow {
  number: string;
  floor?: string;
  coefficient: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
  notes?: string;
  _errors: string[];
}

// ─── Columnas ────────────────────────────────────────────────
const REQUIRED_HEADERS = ['numero', 'coeficiente'];
const OPTIONAL_HEADERS = ['piso', 'superficie', 'dormitorios', 'banos', 'estado', 'notas'];

const STATUS_MAP: Record<string, 'OCCUPIED' | 'VACANT' | 'MAINTENANCE'> = {
  ocupado: 'OCCUPIED', occupied: 'OCCUPIED', ocup: 'OCCUPIED',
  libre: 'VACANT', vacio: 'VACANT', vacío: 'VACANT', vacant: 'VACANT',
  mantenimiento: 'MAINTENANCE', maintenance: 'MAINTENANCE', mant: 'MAINTENANCE',
};

const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Ocupado', VACANT: 'Libre', MAINTENANCE: 'Mantenimiento',
};

const TEMPLATE = [
  [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].join(','),
  '101,0.0833,1,55,1,1,OCUPADO,',
  '201,0.0833,2,55,1,1,OCUPADO,',
  '301,0.0833,3,55,1,1,OCUPADO,',
  'PH,0.1250,5,120,3,2,LIBRE,Penthouse con terraza',
].join('\n');

// ─── Parser CSV ───────────────────────────────────────────────
function splitCsvLine(line: string, sep = ','): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === sep && !inQ) {
      cells.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const rawHeader = lines[0];
  const sep = rawHeader.split(';').length > rawHeader.split(',').length ? ';' : ',';
  const header = splitCsvLine(rawHeader, sep).map(h =>
    h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
  );
  const idx = (col: string) => header.indexOf(col);

  const missingCols = REQUIRED_HEADERS.filter(h => idx(h) === -1);
  if (missingCols.length > 0) {
    throw new Error(`Faltan columnas requeridas: ${missingCols.join(', ')}`);
  }

  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line, sep);
    const get = (col: string) => cells[idx(col)]?.trim() ?? '';
    const errors: string[] = [];

    const number      = get('numero');
    const floor       = get('piso') || undefined;
    const coeffRaw    = get('coeficiente').replace(',', '.');
    const areaRaw     = get('superficie').replace(',', '.');
    const bedsRaw     = get('dormitorios');
    const bathsRaw    = get('banos');
    const statusRaw   = get('estado').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const notes       = get('notas') || undefined;

    if (!number) errors.push('Número de apto requerido');

    const coefficient = parseFloat(coeffRaw);
    if (isNaN(coefficient) || coefficient <= 0) errors.push('Coeficiente inválido (ej: 0.0833)');

    const area     = areaRaw ? parseFloat(areaRaw) : undefined;
    if (areaRaw && (isNaN(area!) || area! <= 0)) errors.push('Superficie inválida');

    const bedrooms = bedsRaw ? parseInt(bedsRaw, 10) : undefined;
    if (bedsRaw && isNaN(bedrooms!)) errors.push('Dormitorios inválido');

    const bathrooms = bathsRaw ? parseInt(bathsRaw, 10) : undefined;
    if (bathsRaw && isNaN(bathrooms!)) errors.push('Baños inválido');

    const status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' =
      STATUS_MAP[statusRaw] ?? (statusRaw === '' ? 'OCCUPIED' : undefined as never);
    if (statusRaw && !STATUS_MAP[statusRaw]) errors.push('Estado: usá OCUPADO, LIBRE o MANTENIMIENTO');

    return { number, floor, coefficient, area, bedrooms, bathrooms, status: status ?? 'OCCUPIED', notes, _errors: errors };
  });
}

// ─── Componente ───────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  buildingId: string;
}

type Step = 'upload' | 'preview' | 'done';
interface ImportResult { created: number; errors: Array<{ row: number; number: string; error: string }> }

export function ApartmentCsvImport({ isOpen, onClose, onImported, buildingId }: Props) {
  const toast   = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]         = useState<Step>('upload');
  const [rows, setRows]         = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);

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
        number:      r.number,
        floor:       r.floor,
        coefficient: r.coefficient,
        area:        r.area,
        bedrooms:    r.bedrooms,
        bathrooms:   r.bathrooms,
        status:      r.status,
        notes:       r.notes,
      }));
      const res = await api.post<ImportResult>(`/apartments/building/${buildingId}/bulk`, payload);
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
    a.href = url; a.download = 'plantilla_apartamentos.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar apartamentos desde CSV" size="lg">
      {/* ── Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Cargá todos los apartamentos de la propiedad de una sola vez.
            </p>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0 ml-3">
              <Download className="w-3.5 h-3.5" /> Plantilla
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-2">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Columnas requeridas:</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_HEADERS.map(h => (
                  <code key={h} className="bg-white border border-gray-200 px-2 py-0.5 rounded">{h}</code>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Opcionales:</p>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONAL_HEADERS.map(h => (
                  <code key={h} className="bg-white border border-gray-200 px-2 py-0.5 rounded">{h}</code>
                ))}
              </div>
            </div>
            <p className="text-slate-500 mt-1">
              <strong>coeficiente:</strong> decimal (ej: 0.0833) &nbsp;·&nbsp;
              <strong>estado:</strong> OCUPADO, LIBRE o MANTENIMIENTO (vacío = OCUPADO)
            </p>
          </div>

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

      {/* ── Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
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

          <div className="overflow-auto max-h-80 rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#', 'Apto', 'Piso', 'Coeficiente', 'Sup. m²', 'Dorm.', 'Baños', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <tr key={i} className={cn('transition-colors', row._errors.length > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50')}>
                    <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.number || <span className="text-red-400 italic">vacío</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{row.floor ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.coefficient ? `${(row.coefficient * 100).toFixed(4)}%` : '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.area ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-center">{row.bedrooms ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-center">{row.bathrooms ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full',
                        row.status === 'OCCUPIED' ? 'bg-emerald-50 text-emerald-700' :
                        row.status === 'VACANT'   ? 'bg-slate-100 text-slate-600' :
                                                    'bg-amber-50 text-amber-700'
                      )}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row._errors.length > 0
                        ? <span title={row._errors.join(' · ')}><XCircle className="w-4 h-4 text-red-400" /></span>
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidRows.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-2">Filas con errores (se omitirán):</p>
              {invalidRows.map((row, i) => (
                <p key={i} className="text-xs text-red-600">
                  <strong>Apto {row.number || rows.indexOf(row) + 1}:</strong> {row._errors.join(' · ')}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button onClick={() => { setStep('upload'); setRows([]); }}
              className="text-sm text-slate-500 hover:text-slate-900">← Subir otro archivo</button>
            <button onClick={handleImport} disabled={importing || validRows.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors">
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Importar {validRows.length} apto{validRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-900">
              {result.created} apartamento{result.created !== 1 ? 's' : ''} importado{result.created !== 1 ? 's' : ''}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 mb-1">{result.errors.length} con error:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">Fila {e.row} — Apto {e.number}: {e.error}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleClose} className="bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800">
              Listo
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
