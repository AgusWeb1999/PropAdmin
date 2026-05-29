'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, LayoutDashboard, Home, Users, Receipt,
  CreditCard, AlertTriangle, Calendar, Wrench, FileText,
  Megaphone, LogOut, ChevronRight, UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Edificios', href: '/edificios', icon: Building2 },
  { label: 'Apartamentos', href: '/apartamentos', icon: Home },
  { label: 'Residentes', href: '/residentes', icon: Users },
  { label: 'Gastos Comunes', href: '/gastos', icon: Receipt },
  { label: 'Pagos', href: '/pagos', icon: CreditCard },
  { label: 'Morosos', href: '/morosos', icon: AlertTriangle },
  { label: 'Reservas', href: '/reservas', icon: Calendar },
  { label: 'Mantenimiento', href: '/mantenimiento', icon: Wrench },
  { label: 'Comunicados', href: '/comunicados', icon: Megaphone },
  { label: 'Documentos', href: '/documentos', icon: FileText },
  { label: 'Usuarios', href: '/usuarios', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col sticky top-0 shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">PropAdmin</p>
            <p className="text-xs text-slate-400 truncate">{user?.company?.name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
              {label}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-slate-600">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user ? `${user.firstName} ${user.lastName}` : '...'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
