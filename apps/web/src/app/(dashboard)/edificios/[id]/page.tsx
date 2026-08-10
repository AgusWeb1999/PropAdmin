'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Home, Users, Receipt, MapPin, Download, Mail, Loader2, Sparkles, Pencil, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApartmentForm } from '@/components/apartments/ApartmentForm';
import { ApartmentCsvImport } from '@/components/apartments/ApartmentCsvImport';
import { ResidentForm } from '@/components/residents/ResidentForm';
import { AccountStatement } from '@/components/apartments/AccountStatement';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface Resident { id: string; firstName: string; lastName: string; type: string; phone: string | null; email: string | null }
interface Apartment {
  id: string; number: string; floor: string | null; coefficient: number;
  status: string; area: number | null; hasParking: boolean; hasStorage: boolean; hasGrill: boolean;
  residents: Resident[];
  charges: Array<{ amount: number; interestAmount: number; paidAmount: number; status: string }>;
}
interface CommonArea {
  id: string; name: string; icon: string | null; description: string | null;
  pricePerUse: number; capacity: number | null; openTime: string | null; closeTime: string | null; rules: string | null;
}
interface Building {
  id: string; name: string; address: string; city: string; totalUnits: number;
  currency: string; interestRate: number;
  apartments: Apartment[];
  commonAreas: CommonArea[];
  _count: { apartments: number };
}

const AMENITY_PRESETS = [
  { icon: '🔥', name: 'Parrillero' },
  { icon: '🏊', name: 'Piscina' },
  { icon: '💪', name: 'Gimnasio' },
  { icon: '💻', name: 'Coworking' },
  { icon: '🎬', name: 'Cine' },
  { icon: '🎉', name: 'Salón de eventos' },
  { icon: '🧺', name: 'Lavandería' },
  { icon: '☀️', name: 'Terraza' },
  { icon: '🏓', name: 'Sum / Juegos' },
  { icon: '🅿️', name: 'Estacionamiento visitas' },
];

type Tab = 'apartamentos' | 'residentes' | 'amenidades';

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('apartamentos');
  const [aptFormOpen, setAptFormOpen] = useState(false);
  const [csvAptOpen, setCsvAptOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Amenidades state
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<CommonArea | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', icon: '', description: '', pricePerUse: 0, capacity: '', openTime: '', closeTime: '', rules: '' });

  const downloadDebtReport = async () => {
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const fullUrl = `${apiUrl}/buildings/${id}/debt-report`;
      const res = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('pdf')) {
        const text = await res.text();
        throw new Error(`Respuesta inesperada (${contentType}): ${text.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `deudas_${building?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF generado correctamente');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`No se pudo descargar el reporte: ${msg}`);
      console.error('[debt-report]', msg);
    } finally {
      setExportingPdf(false);
    }
  };
  const notifyResidents = async () => {
    if (!confirm('¿Enviás el estado de cuenta por email a todos los residentes con deuda pendiente?')) return;
    setSendingEmails(true);
    try {
      await api.post<{ queued: boolean; message: string }>(
        `/buildings/${id}/notify-residents`, {}
      );
      // El servidor responde inmediatamente; el envío ocurre en segundo plano
      toast.success('✓ Notificaciones en camino — los emails llegarán en segundos');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar emails');
    } finally {
      setSendingEmails(false);
    }
  };

  const openEditArea = (area: CommonArea) => {
    setEditingArea(area);
    setAreaForm({
      name: area.name, icon: area.icon ?? '', description: area.description ?? '',
      pricePerUse: area.pricePerUse, capacity: area.capacity?.toString() ?? '',
      openTime: area.openTime ?? '', closeTime: area.closeTime ?? '', rules: area.rules ?? '',
    });
    setAreaFormOpen(true);
  };

  const handleSaveArea = async () => {
    const body = {
      buildingId: id,
      name: areaForm.name,
      icon: areaForm.icon || null,
      description: areaForm.description || null,
      pricePerUse: Number(areaForm.pricePerUse) || 0,
      capacity: areaForm.capacity ? Number(areaForm.capacity) : undefined,
      openTime: areaForm.openTime || null,
      closeTime: areaForm.closeTime || null,
      rules: areaForm.rules || null,
    };
    try {
      if (editingArea) {
        await api.put(`/common-areas/${editingArea.id}`, body);
        toast.success('Amenidad actualizada');
      } else {
        await api.post('/common-areas', body);
        toast.success('Amenidad agregada');
      }
      setAreaFormOpen(false);
      setEditingArea(null);
      setAreaForm({ name: '', icon: '', description: '', pricePerUse: 0, capacity: '', openTime: '', closeTime: '', rules: '' });
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('¿Eliminás esta amenidad?')) return;
    try {
      await api.delete(`/common-areas/${areaId}`);
      toast.success('Amenidad eliminada');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const [resFormApt, setResFormApt] = useState<Apartment | null>(null);
  const [statementApt, setStatementApt] = useState<Apartment | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Building>(`/buildings/${id}`)
      .then(setBuilding)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !building) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Home className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">Edificio no encontrado</h2>
          <p className="text-sm text-slate-400">El edificio que buscás no existe o fue eliminado.</p>
        </div>
        <button
          onClick={() => router.push('/edificios')}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a edificios
        </button>
      </div>
    );
  }

  const allResidents = building.apartments.flatMap((a) =>
    a.residents.map((r) => ({ ...r, apartment: a }))
  );

  const totalDebt = building.apartments.reduce((sum, a) =>
    sum + (a.charges ?? []).filter(c => c.status !== 'PAID')
      .reduce((s, c) => s + Number(c.amount) + Number(c.interestAmount) - Number(c.paidAmount ?? 0), 0), 0
  );

  return (
    <>
      <Header
        title={building.name}
        subtitle={`${building.address}, ${building.city}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={notifyResidents}
              disabled={sendingEmails}
              className="flex items-center gap-1.5 border border-gray-200 text-slate-600 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {sendingEmails
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Mail className="w-3.5 h-3.5" />}
              {sendingEmails ? 'Enviando...' : 'Enviar emails'}
            </button>
            <button
              onClick={downloadDebtReport}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 border border-gray-200 text-slate-600 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
              {exportingPdf ? 'Generando...' : 'Exportar deudas'}
            </button>
            {tab === 'apartamentos' && (
              <>
                <button
                  onClick={() => setCsvAptOpen(true)}
                  className="flex items-center gap-1.5 border border-gray-200 text-slate-600 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Importar CSV
                </button>
                <button
                  onClick={() => setAptFormOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo apartamento
                </button>
              </>
            )}
            {tab === 'amenidades' && (
              <button
                onClick={() => { setEditingArea(null); setAreaFormOpen(true); }}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva amenidad
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-5 animate-slide-up">
        {/* Back */}
        <Link href="/edificios" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a edificios
        </Link>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Unidades', value: building._count.apartments, sub: `de ${building.totalUnits} totales`, icon: Home },
            { label: 'Residentes', value: allResidents.length, sub: 'activos', icon: Users },
            { label: 'Deuda total', value: formatCurrency(totalDebt, building.currency), sub: 'pendiente', icon: Receipt },
            { label: 'Ubicación', value: building.city, sub: building.address, icon: MapPin },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-500">{label}</p>
              </div>
              <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
              <p className="text-xs text-slate-400 truncate">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['apartamentos', 'residentes', 'amenidades'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all',
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Apartamentos tab */}
        {tab === 'apartamentos' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {building.apartments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm font-semibold text-slate-900 mb-1">Sin apartamentos</p>
                <p className="text-sm text-slate-500 mb-4">Agregá las unidades del edificio</p>
                <button
                  onClick={() => setAptFormOpen(true)}
                  className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
                >
                  Agregar apartamento
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Apt', 'Piso', 'Coeficiente', 'Estado', 'Residente', 'Deuda', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {building.apartments.map((apt) => {
                    const debt = (apt.charges ?? []).filter(c => c.status !== 'PAID')
                      .reduce((s, c) => s + Number(c.amount) + Number(c.interestAmount) - Number(c.paidAmount ?? 0), 0);
                    const resident = apt.residents[0];
                    return (
                      <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{apt.number}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{apt.floor ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{(Number(apt.coefficient) * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {resident ? `${resident.firstName} ${resident.lastName}` : (
                            <span className="text-slate-400 italic">Sin residente</span>
                          )}
                          {resident && <StatusBadge status={resident.type} className="ml-2" />}
                        </td>
                        <td className="px-4 py-3">
                          {debt > 0
                            ? <span className="text-sm font-semibold text-red-600">{formatCurrency(debt, building.currency)}</span>
                            : <span className="text-sm text-emerald-600">Al día</span>
                          }
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
                              onClick={() => setResFormApt(apt)}
                              className="text-xs text-slate-500 hover:text-slate-900 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                            >
                              + Res.
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
        )}

        {/* Residentes tab */}
        {tab === 'residentes' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {allResidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm font-semibold text-slate-900">Sin residentes</p>
                <p className="text-sm text-slate-500">Primero agregá apartamentos y luego sus residentes</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Nombre', 'Tipo', 'Apartamento', 'Teléfono', 'Email'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allResidents.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.firstName} {r.lastName}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.type} /></td>
                      <td className="px-4 py-3 text-sm text-slate-600">Apt {r.apartment.number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Amenidades tab */}
        {tab === 'amenidades' && (
          <div className="space-y-4">
            {/* Form inline */}
            {areaFormOpen && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingArea ? 'Editar amenidad' : 'Nueva amenidad'}
                </h3>
                {/* Presets */}
                {!editingArea && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Elegí un preset o personalizá:</p>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_PRESETS.map(p => (
                        <button key={p.name} type="button"
                          onClick={() => setAreaForm(f => ({ ...f, name: p.name, icon: p.icon }))}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all',
                            areaForm.name === p.name && areaForm.icon === p.icon
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-gray-200 hover:border-slate-400 text-slate-700'
                          )}
                        >
                          <span>{p.icon}</span> {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
                    <input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Parrillero" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ícono (emoji)</label>
                    <input value={areaForm.icon} onChange={e => setAreaForm(f => ({ ...f, icon: e.target.value }))}
                      placeholder="🔥" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Costo por uso ({building.currency})</label>
                    <input type="number" min="0" value={areaForm.pricePerUse}
                      onChange={e => setAreaForm(f => ({ ...f, pricePerUse: Number(e.target.value) }))}
                      placeholder="0 = gratuito" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Capacidad (personas)</label>
                    <input type="number" min="1" value={areaForm.capacity}
                      onChange={e => setAreaForm(f => ({ ...f, capacity: e.target.value }))}
                      placeholder="Opcional" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Horario apertura</label>
                    <input type="time" value={areaForm.openTime} onChange={e => setAreaForm(f => ({ ...f, openTime: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Horario cierre</label>
                    <input type="time" value={areaForm.closeTime} onChange={e => setAreaForm(f => ({ ...f, closeTime: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Descripción / Reglas</label>
                    <textarea value={areaForm.rules} onChange={e => setAreaForm(f => ({ ...f, rules: e.target.value }))}
                      rows={2} placeholder="Ej: Máx. 2 horas por reserva. Dejar limpio al finalizar."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setAreaFormOpen(false); setEditingArea(null); }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">Cancelar</button>
                  <button onClick={handleSaveArea}
                    className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800">
                    {editingArea ? 'Guardar cambios' : 'Agregar'}
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {building.commonAreas.length === 0 && !areaFormOpen ? (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
                <Sparkles className="w-10 h-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-900">Sin amenidades configuradas</p>
                <p className="text-sm text-slate-400">Agregá parrillero, piscina, gym y más</p>
                <button onClick={() => { setEditingArea(null); setAreaFormOpen(true); }}
                  className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 mt-1">
                  Agregar amenidad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {building.commonAreas.map(area => (
                  <div key={area.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {area.icon && <span className="text-3xl">{area.icon}</span>}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{area.name}</p>
                          {area.description && <p className="text-xs text-slate-500 mt-0.5">{area.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditArea(area)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteArea(area.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        Number(area.pricePerUse) === 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      )}>
                        {Number(area.pricePerUse) === 0 ? 'Gratuito' : `${building.currency} ${Number(area.pricePerUse).toLocaleString('es-UY')} / uso`}
                      </span>
                      {area.capacity && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Máx. {area.capacity} personas
                        </span>
                      )}
                      {area.openTime && area.closeTime && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {area.openTime} – {area.closeTime}
                        </span>
                      )}
                    </div>
                    {area.rules && (
                      <p className="mt-2 text-xs text-slate-400 line-clamp-2">{area.rules}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ApartmentForm
        isOpen={aptFormOpen}
        onClose={() => setAptFormOpen(false)}
        onCreated={load}
        buildingId={building.id}
      />
      <ApartmentCsvImport
        isOpen={csvAptOpen}
        onClose={() => setCsvAptOpen(false)}
        onImported={load}
        buildingId={building.id}
      />
      {resFormApt && (
        <ResidentForm
          isOpen={!!resFormApt}
          onClose={() => setResFormApt(null)}
          onCreated={load}
          apartmentId={resFormApt.id}
          apartmentNumber={resFormApt.number}
        />
      )}
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
