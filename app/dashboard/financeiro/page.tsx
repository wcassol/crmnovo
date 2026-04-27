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
import { DashboardHeader } from '@/components/dashboard/header';
import { createClient } from '@/lib/supabase/server';
import { parseFiltros } from '@/lib/filtros';
import { buscarFunilTotais } from '@/lib/queries';
import { calcularKPIs, calcularReceitaPorTaxa } from '@/lib/metrics';
import { formatBRL, formatNumber, formatPercent } from '@/lib/utils';
import { BUSINESS_CONSTANTS, TIPO_CAMPANHA_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [app, serv, total] = await Promise.all([
    buscarFunilTotais(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipoCampanha: 'APP_MOBILIDADE',
    }),
    buscarFunilTotais(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipoCampanha: 'SERVIDOR_PUBLICO',
    }),
    buscarFunilTotais(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipoCampanha: 'TODOS',
    }),
  ]);

  const linhas = [
    {
      label: TIPO_CAMPANHA_LABELS.APP_MOBILIDADE,
      totais: app,
      kpis: calcularKPIs(app),
    },
    {
      label: TIPO_CAMPANHA_LABELS.SERVIDOR_PUBLICO,
      totais: serv,
      kpis: calcularKPIs(serv),
    },
    {
      label: 'Total',
      totais: total,
      kpis: calcularKPIs(total),
    },
  ];

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
          Financeiro
        </h1>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Comparativo APP vs Servidor</CardTitle>
            <p className="text-xs text-muted-foreground">
              Receita entrada usa R$ {BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA} fixo por contrato assinado.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">Receita entrada</TableHead>
                  <TableHead className="text-right">ROI entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.label}>
                    <TableCell className="font-semibold text-brand-dark">
                      {l.label}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(l.kpis.investimento)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(l.kpis.totalLeads)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(l.kpis.cpl)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(l.kpis.contratosAssinados)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(l.kpis.cac)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(l.kpis.receitaEntrada)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-brand-green">
                      {formatPercent(l.kpis.roiEntrada / 100, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle>Cenarios por taxa de procedencia</CardTitle>
            <p className="text-xs text-muted-foreground">
              Receita = contratos {'×'} R${BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA}{' '}
              + (contratos {'×'} taxa) {'×'} R${BUSINESS_CONSTANTS.VALOR_POTENCIAL_CASO}.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  {BUSINESS_CONSTANTS.TAXAS_PROCEDENCIA.map((t) => (
                    <TableHead key={t} className="text-right">
                      {Math.round(t * 100)}%
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.label}>
                    <TableCell className="font-semibold">{l.label}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(l.kpis.contratosAssinados)}
                    </TableCell>
                    {BUSINESS_CONSTANTS.TAXAS_PROCEDENCIA.map((taxa) => (
                      <TableCell key={taxa} className="text-right">
                        {formatBRL(
                          calcularReceitaPorTaxa(l.kpis.contratosAssinados, taxa),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle>Projecao de escala</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mantendo CPL e taxa atual, qual o ROI ao escalar investimento.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead className="text-right">2x</TableHead>
                  <TableHead className="text-right">3x</TableHead>
                  <TableHead className="text-right">5x</TableHead>
                  <TableHead className="text-right">10x</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.label}>
                    <TableCell className="font-semibold">{l.label}</TableCell>
                    {[2, 3, 5, 10].map((mult) => {
                      const investimento = l.kpis.investimento * mult;
                      const contratos = l.kpis.contratosAssinados * mult;
                      const receita =
                        contratos * BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA;
                      return (
                        <TableCell key={mult} className="text-right">
                          <div>{formatBRL(investimento)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(contratos)} contr. -&gt;{' '}
                            {formatBRL(receita)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
