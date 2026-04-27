import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/dashboard/header';
import { LeadsFilters } from './filters';
import { createClient } from '@/lib/supabase/server';
import { parseFiltros } from '@/lib/filtros';
import { buscarLeads, buscarFunilTotais } from '@/lib/queries';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatTempoMin,
} from '@/lib/utils';
import { TIPO_CAMPANHA_LABELS, BUSINESS_CONSTANTS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = getStr(searchParams.status) ?? 'TODOS';
  const prefixo = getStr(searchParams.prefixo) ?? 'TODOS';
  const fonte = getStr(searchParams.fonte) ?? 'TODOS';
  const busca = getStr(searchParams.busca) ?? '';
  const offset = Number(getStr(searchParams.offset) ?? '0');

  const [leadsResp, totais] = await Promise.all([
    buscarLeads(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipo: filtros.tipo,
      status,
      prefixo,
      fonte,
      busca,
      offset,
      limit: 100,
    }),
    buscarFunilTotais(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipoCampanha: filtros.tipo,
    }),
  ]);

  const tempos = leadsResp.rows
    .map((l: any) => l.tempo_atendimento_min)
    .filter((t: any): t is number => t !== null && t !== undefined);
  const mediano =
    tempos.length > 0
      ? tempos.sort((a: number, b: number) => a - b)[Math.floor(tempos.length / 2)]
      : null;
  const medio =
    tempos.length > 0
      ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length
      : null;
  const sub5 = tempos.filter((t: number) => t < 5).length;
  const acima60 = tempos.filter((t: number) => t >= 60).length;

  return (
    <>
      <DashboardHeader
        email={user?.email ?? ''}
        from={filtros.from}
        to={filtros.to}
        tipo={filtros.tipo}
      />
      <main className="flex-1 px-4 pb-20 pt-4 sm:px-6 md:pb-8">
        <h1 className="mb-4 text-xl font-bold text-brand-dark sm:text-2xl">
          Leads
        </h1>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniCard
            label="Total no periodo"
            valor={formatNumber(totais.leadsWts)}
          />
          <MiniCard
            label="Tempo medio resp."
            valor={formatTempoMin(medio)}
          />
          <MiniCard
            label="Tempo mediano"
            valor={formatTempoMin(mediano)}
          />
          <MiniCard
            label={`Resp. < ${BUSINESS_CONSTANTS.META_TEMPO_RESPOSTA_MIN}min`}
            valor={`${sub5} / ${tempos.length}`}
            hint={`${acima60} > 60min`}
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {leadsResp.total} leads {filtros.tipo !== 'TODOS' && `(${TIPO_CAMPANHA_LABELS[filtros.tipo]})`}
            </CardTitle>
            <LeadsFilters
              status={status}
              prefixo={prefixo}
              fonte={fonte}
              busca={busca}
            />
          </CardHeader>
          <CardContent>
            {leadsResp.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado com esses filtros.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Resp.</TableHead>
                    <TableHead>UTM Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsResp.rows.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(l.data_criacao)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {l.nome ?? ','}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {l.telefone ?? ','}
                      </TableCell>
                      <TableCell>
                        <StatusLeadBadge status={l.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {TIPO_CAMPANHA_LABELS[l.tipo_campanha ?? ''] ?? l.tipo_campanha ?? ','}
                      </TableCell>
                      <TableCell>
                        {l.prefixo_criativo ? (
                          <Badge variant="purple">{l.prefixo_criativo}</Badge>
                        ) : (
                          <span className="text-muted-foreground">,</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTempoMin(l.tempo_atendimento_min)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {l.utm_campaign ?? ','}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function MiniCard({
  label,
  valor,
  hint,
}: {
  label: string;
  valor: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-brand-dark">{valor}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function StatusLeadBadge({ status }: { status: string | null }) {
  if (status === 'Concluido') return <Badge variant="success">Concluido</Badge>;
  if (status === 'Em andamento')
    return <Badge variant="warning">Em andamento</Badge>;
  if (status === 'Pendente') return <Badge variant="destructive">Pendente</Badge>;
  return <Badge variant="outline">{status ?? ','}</Badge>;
}
