'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  Users,
  FileSignature,
  DollarSign,
  UserCheck,
  Scale,
  CalendarClock,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Visao geral', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarClock },
  { href: '/dashboard/campanhas', label: 'Campanhas', icon: Megaphone },
  { href: '/dashboard/criativos', label: 'Criativos', icon: Sparkles },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/contratos', label: 'Contratos', icon: FileSignature },
  { href: '/dashboard/clientes', label: 'Clientes', icon: UserCheck },
  { href: '/dashboard/casos', label: 'Casos', icon: Scale },
  { href: '/dashboard/honorarios', label: 'Honorarios', icon: Receipt },
  { href: '/dashboard/bi', label: 'BI juridico', icon: TrendingUp },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:bg-white md:p-3">
      <div className="px-3 pb-4 pt-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-medium">
          Wendrill Cassol
        </div>
        <div className="text-sm font-bold text-brand-dark">Funil Comercial</div>
      </div>
      {links.map((link) => {
        const Icon = link.icon;
        const ativo =
          pathname === link.href ||
          (link.href !== '/dashboard' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              ativo
                ? 'bg-brand-dark text-white'
                : 'text-brand-dark hover:bg-brand-surface',
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t bg-white py-1 md:hidden">
      {links.map((link) => {
        const Icon = link.icon;
        const ativo =
          pathname === link.href ||
          (link.href !== '/dashboard' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium',
              ativo ? 'text-brand-dark' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
