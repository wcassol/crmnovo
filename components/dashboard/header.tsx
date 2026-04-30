'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RefreshCw, LogOut, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TIPO_CAMPANHA_LABELS } from '@/lib/constants';

interface Props {
  email: string;
  from: string;
  to: string;
  tipo: string;
}

export function DashboardHeader({ email, from, to, tipo }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function aplicarFiltro(updates: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  async function sincronizar() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const resp = await fetch('/api/sync', { method: 'POST' });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setSyncMsg('Sincronizacao disparada.');
      } else {
        const detalhe = json.error ?? `HTTP ${resp.status}`;
        setSyncMsg(`Falha: ${detalhe}`);
      }
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Erro de rede');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 8000);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-white px-2 text-sm">
            <Calendar className="h-4 w-4 text-brand-medium" />
            <Input
              type="date"
              value={from.slice(0, 10)}
              onChange={(e) =>
                aplicarFiltro({ from: `${e.target.value}T00:00:00` })
              }
              className="h-9 border-0 px-1 focus-visible:ring-0"
            />
            <span className="text-muted-foreground">ate</span>
            <Input
              type="date"
              value={to.slice(0, 10)}
              onChange={(e) =>
                aplicarFiltro({ to: `${e.target.value}T23:59:59` })
              }
              className="h-9 border-0 px-1 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-white px-2 text-sm">
            <Tag className="h-4 w-4 text-brand-medium" />
            <Select
              value={tipo}
              onChange={(e) => aplicarFiltro({ tipo: e.target.value })}
              className="h-9 border-0 px-1 focus-visible:ring-0"
            >
              <option value="TODOS">Todos</option>
              <option value="APP_MOBILIDADE">{TIPO_CAMPANHA_LABELS.APP_MOBILIDADE}</option>
              <option value="SERVIDOR_PUBLICO">{TIPO_CAMPANHA_LABELS.SERVIDOR_PUBLICO}</option>
              <option value="NAO_CLASSIFICADO">{TIPO_CAMPANHA_LABELS.NAO_CLASSIFICADO}</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {syncMsg && (
            <span className="text-xs text-muted-foreground">{syncMsg}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={syncing || isPending}
            onClick={sincronizar}
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
            />
            Sincronizar agora
          </Button>
          <span className="hidden text-xs text-muted-foreground md:inline">
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="icon" type="submit" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
