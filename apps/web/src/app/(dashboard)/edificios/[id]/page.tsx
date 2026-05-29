'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Home, Users, Receipt, MapPin, Download } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApartmentForm } from '@/components/apartments/ApartmentForm';
import { ResidentForm } from '@/components/residents/ResidentForm';
import { AccountStatement } from '@/components/apartments/AccountStatement';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

interface Resident { id: string; firstName: string; lastName: string; type: string; phone: string | null; email: string | null }
interface Apartment {
  id: string; number: string; floor: string | null; coefficient: number;
  status: string; area: number | null; hasParking: boolean; hasStorage: boolean;
  residents: Resident[];
  charges: Array<{ amount: number; interestAmount: number; status: string }>;
}
interface Building {
  id: string; name: string; address: string; city: string; totalUnits: number;
  currency: string; interestRate: number;
  apartments: Apartment[];
  _count: { apartments: number };
}

type Tab = 'apartamentos' | 'residentes';

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('apartamentos');
  const [aptFormOpen, setAptFormOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const downloadDebtReport = async () => {
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/buildings/${id}/debt-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al generar el reporte');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `deudas_${building?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dateStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silently ignore */
    } finally {
      setExportingPdf(false);
    }
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
      .reduce((s, c) => s + Number(c.amount) + Number(c.interestAmount), 0), 0
  );

  return (
    <>
      <Header
        title={building.name}
        subtitle={`${building.address}, ${building.city}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={downloadDebtReport}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 border border-gray-200 text-slate-600 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
              {exportingPdf ? 'Generando...' : 'Exportar deudas'}
            </button>
            {tab === 'apartamentos' && (
              <button
                onClick={() => setAptFormOpen(true)}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo apartamento
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
          {(['apartamentos', 'residentes'] as Tab[]).map((t) => (
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
                      .reduce((s, c) => s + Number(c.amount) + Number(c.interestAmount), 0);
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
      </div>

      {/* Modals */}
      <ApartmentForm
        isOpen={aptFormOpen}
        onClose={() => setAptFormOpen(false)}
        onCreated={load}
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
