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
import { createClient } from '@/lib/supabase/server';
import { parseFiltros } from '@/lib/filtros';
import { buscarCampanhas } from '@/lib/queries';
import { formatBRL, formatNumber, formatPercent } from '@/lib/utils';
import { BUSINESS_CONSTANTS, TIPO_CAMPANHA_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const campanhas = await buscarCampanhas(supabase, filtros.tipo);

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
          Campanhas Meta Ads
        </h1>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{campanhas.length} campanhas</CardTitle>
            <p className="text-xs text-muted-foreground">
              Estimativa de contratos: resultados {'×'} 7% (APP) ou
              resultados {'×'} 1,4% (SERV).
            </p>
          </CardHeader>
          <CardContent>
            {campanhas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma campanha encontrada. Rode o workflow {'"'}Sync Meta Ads{'"'}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Impressoes</TableHead>
                    <TableHead className="text-right">Alcance</TableHead>
                    <TableHead className="text-right">Resultados</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">CPR</TableHead>
                    <TableHead className="text-right">Contratos est.</TableHead>
                    <TableHead className="text-right">ROI est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campanhas.map((c: any) => {
                    const taxa =
                      c.tipo === 'APP_MOBILIDADE'
                        ? 0.07
                        : c.tipo === 'SERVIDOR_PUBLICO'
                          ? 0.014
                          : 0.03;
                    const contratosEst = (c.resultados ?? 0) * taxa;
                    const receitaEst =
                      contratosEst * BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA;
                    const roiEst =
                      Number(c.gasto ?? 0) > 0
                        ? receitaEst / Number(c.gasto)
                        : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="max-w-[260px] truncate font-medium">
                          {c.nome}
                        </TableCell>
                        <TableCell>
                          <TipoBadge tipo={c.tipo} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(c.impressoes)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(c.alcance)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(c.resultados)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(c.gasto))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(c.cpr))}
                        </TableCell>
                        <TableCell className="text-right">
                          {contratosEst.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(roiEst, 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  if (tipo === 'APP_MOBILIDADE')
    return <Badge variant="success">{TIPO_CAMPANHA_LABELS.APP_MOBILIDADE}</Badge>;
  if (tipo === 'SERVIDOR_PUBLICO')
    return <Badge variant="default">{TIPO_CAMPANHA_LABELS.SERVIDOR_PUBLICO}</Badge>;
  return <Badge variant="secondary">{TIPO_CAMPANHA_LABELS[tipo] ?? tipo}</Badge>;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">,</Badge>;
  if (status === 'ACTIVE') return <Badge variant="success">Ativa</Badge>;
  if (status === 'PAUSED') return <Badge variant="warning">Pausada</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}
