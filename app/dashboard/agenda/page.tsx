import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/server';
import { buscarAgenda } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';
import { AgendaItem, TipoAgenda } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIPO_LABELS: Record<TipoAgenda, string> = {
  audiencia: 'Audiencia',
  prazo: 'Prazo',
  reuniao: 'Reuniao',
};

const TIPO_CORES: Record<TipoAgenda, string> = {
  audiencia: 'bg-brand-medium text-white',
  prazo: 'bg-brand-red text-white',
  reuniao: 'bg-brand-green text-white',
};

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function diasParaPrazo(quando: string): { dias: number; label: string; cor: string } {
  const d = Math.ceil(
    (new Date(quando).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (d < 0) return { dias: d, label: `${Math.abs(d)} dias atras`, cor: 'text-brand-red' };
  if (d === 0) return { dias: 0, label: 'Hoje', cor: 'text-brand-red font-semibold' };
  if (d === 1) return { dias: 1, label: 'Amanha', cor: 'text-brand-orange font-semibold' };
  if (d <= 3) return { dias: d, label: `Em ${d} dias`, cor: 'text-brand-orange' };
  if (d <= 7) return { dias: d, label: `Em ${d} dias`, cor: 'text-brand-dark' };
  return { dias: d, label: `Em ${d} dias`, cor: 'text-muted-foreground' };
}

function agruparPorDia(items: AgendaItem[]): { dia: string; items: AgendaItem[] }[] {
  const map = new Map<string, AgendaItem[]>();
  for (const it of items) {
    const dia = it.quando.slice(0, 10);
    if (!map.has(dia)) map.set(dia, []);
    map.get(dia)!.push(it);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, items]) => ({ dia, items }));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const tipo =
    (getStr(searchParams.tipo) as
      | 'audiencia'
      | 'prazo'
      | 'reuniao'
      | 'TODOS'
      | undefined) ?? 'TODOS';

  const items = await buscarAgenda(supabase, { tipo });
  const grupos = agruparPorDia(items);

  const contagens = {
    audiencia: items.filter((i) => i.tipo === 'audiencia').length,
    prazo: items.filter((i) => i.tipo === 'prazo').length,
    reuniao: items.filter((i) => i.tipo === 'reuniao').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Audiencias, prazos e reunioes dos proximos 60 dias.
          </p>
        </div>
        <form>
          <Select name="tipo" defaultValue={tipo} className="w-full md:w-48">
            <option value="TODOS">Todos</option>
            <option value="audiencia">Audiencias ({contagens.audiencia})</option>
            <option value="prazo">Prazos ({contagens.prazo})</option>
            <option value="reuniao">Reunioes ({contagens.reuniao})</option>
          </Select>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs uppercase text-muted-foreground">Audiencias</span>
            <span className="text-2xl font-bold text-brand-medium">
              {contagens.audiencia}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs uppercase text-muted-foreground">Prazos</span>
            <span className="text-2xl font-bold text-brand-red">{contagens.prazo}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs uppercase text-muted-foreground">Reunioes</span>
            <span className="text-2xl font-bold text-brand-green">
              {contagens.reuniao}
            </span>
          </CardContent>
        </Card>
      </div>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nada agendado no periodo.
          </CardContent>
        </Card>
      ) : (
        grupos.map(({ dia, items }) => (
          <Card key={dia}>
            <CardHeader>
              <CardTitle className="text-sm">
                {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {items.map((it) => {
                  const prazo = diasParaPrazo(it.quando);
                  return (
                    <li
                      key={`${it.tipo}-${it.id}`}
                      className="flex items-start gap-3 rounded-md border bg-white p-3"
                    >
                      <Badge className={TIPO_CORES[it.tipo]}>
                        {TIPO_LABELS[it.tipo]}
                      </Badge>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-brand-dark">
                          {it.caso_titulo ?? it.contato_nome ?? '(sem titulo)'}
                          {it.subtipo && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {it.subtipo}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(it.quando)}
                          {it.contato_nome && it.caso_titulo && ` - ${it.contato_nome}`}
                          {it.local && ` - ${it.local}`}
                        </div>
                        {it.caso_id && (
                          <Link
                            href={`/dashboard/casos/${it.caso_id}`}
                            className="mt-1 inline-block text-xs text-brand-dark hover:underline"
                          >
                            Abrir caso
                          </Link>
                        )}
                      </div>
                      <div className={`text-xs ${prazo.cor}`}>{prazo.label}</div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
