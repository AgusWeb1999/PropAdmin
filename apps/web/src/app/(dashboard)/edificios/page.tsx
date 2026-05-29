'use client';
import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BuildingCard } from '@/components/buildings/BuildingCard';
import { BuildingForm } from '@/components/buildings/BuildingForm';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  currency: string;
  isActive: boolean;
  _count: { apartments: number };
}

export default function EdificiosPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Building[]>('/buildings').then(setBuildings).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header
        title="Edificios"
        subtitle={`${buildings.length} edificio${buildings.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo edificio
          </button>
        }
      />

      <div className="p-6 animate-slide-up">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar edificio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200',
              'bg-white placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900',
              'transition-all'
            )}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-40 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-gray-50 rounded-xl" />
                  <div className="h-20 bg-gray-50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {search ? 'Sin resultados' : 'Sin edificios'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {search
                ? `No encontramos edificios con "${search}"`
                : 'Agrega tu primer edificio para comenzar'}
            </p>
            {!search && (
              <button
                onClick={() => setFormOpen(true)}
                className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Agregar edificio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((building) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>
        )}
      </div>

      <BuildingForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={load}
      />
    </>
  );
}
