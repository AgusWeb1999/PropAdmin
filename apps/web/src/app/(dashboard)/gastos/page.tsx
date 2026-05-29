'use client';
import { useEffect, useState } from 'react';
import { Plus, Zap, Droplets, Sparkles, Settings, MoreHorizontal, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { api } from '@/lib/api';
import { formatCurrency, EXPENSE_CATEGORY_LABELS } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface Building { id: string; name: string }
interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  period: string;
  invoiceNumber: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ELECTRICITY: <Zap className="w-4 h-4" />,
  WATER: <Droplets className="w-4 h-4" />,
  CLEANING: <Sparkles className="w-4 h-4" />,
  ELEVATOR: <Settings className="w-4 h-4" />,
};

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function GastosPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<Building[]>('/buildings').then((data) => {
      setBuildings(data);
      if (data.length > 0) setSelectedBuilding(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;
    setLoading(true);
    api.get<Expense[]>(`/expenses/building/${selectedBuilding}?period=${period}`)
      .then(setExpenses)
      .finally(() => setLoading(false));
  }, [selectedBuilding, period]);

  const loadExpenses = () => {
    if (!selectedBuilding) return;
    setLoading(true);
    api.get<Expense[]>(`/expenses/building/${selectedBuilding}?period=${period}`)
      .then(setExpenses)
      .finally(() => setLoading(false));
  };

  const generateCharges = async () => {
    if (!selectedBuilding || expenses.length === 0) return;
    setGenerating(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(10);
      dueDate.setMonth(dueDate.getMonth() + 1);
      await api.post(`/expenses/building/${selectedBuilding}/generate-charges`, {
        period,
        dueDate: dueDate.toISOString(),
      });
      toast.success(`Expensas del período ${period} generadas correctamente`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al generar expensas');
    } finally {
      setGenerating(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <>
      <Header
        title="Gastos Comunes"
        subtitle="Gestión de gastos mensuales por edificio"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo gasto
          </button>
        }
      />

      <div className="p-6 space-y-5 animate-slide-up">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {/* Summary card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Total gastos — {period}</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{formatCurrency(total)}</p>
            <p className="text-sm text-slate-400 mt-1">{expenses.length} concepto{expenses.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            disabled={generating || expenses.length === 0}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={generateCharges}
          >
            {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Generar expensas
          </button>
        </div>

        {/* Expense list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Sin gastos para este período</p>
            <p className="text-sm text-slate-400 mt-1">Agrega los gastos del edificio para generar las expensas</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {CATEGORY_ICONS[expense.category] ?? <Settings className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{expense.description}</p>
                  </div>
                  {expense.invoiceNumber && (
                    <span className="text-xs text-slate-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      #{expense.invoiceNumber}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div className="border-t border-gray-200 flex items-center justify-between px-4 py-3 bg-gray-50">
              <p className="text-sm font-semibold text-slate-700">Total del período</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(total)}</p>
            </div>
          </div>
        )}
      </div>

      <ExpenseForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreated={loadExpenses}
        buildingId={selectedBuilding}
      />
    </>
  );
}
