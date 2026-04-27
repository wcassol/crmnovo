import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardHeader } from '@/components/dashboard/header';
import { KPICard } from '@/components/dashboard/kpi-card';
import { FunilChart } from '@/components/dashboard/funil-chart';
import { LinhasChart } from '@/components/dashboard/line-chart';
import { BarrasChart } from '@/components/dashboard/bar-chart';
import {
  DollarSign,
  Users,
  FileSignature,
  TrendingUp,
  Target,
  PiggyBank,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { parseFiltros } from '@/lib/filtros';
import {
  buscarFunilTotais,
  buscarLeadsPorDia,
  buscarCampanhas,
} from '@/lib/queries';
import { calcularKPIs, calcularEtapasFunil } from '@/lib/metrics';
import { formatBRL, formatNumber, formatPercent } from '@/lib/utils';
import { TIPO_CAMPANHA_CORES, TIPO_CAMPANHA_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [totais, leadsPorDia, campanhas] = await Promise.all([
    buscarFunilTotais(supabase, {
      from: filtros.from,
      to: filtros.to,
      tipoCampanha: filtros.tipo,
    }),
    buscarLeadsPorDia(supabase, { from: filtros.from, to: filtros.to }),
    buscarCampanhas(supabase, filtros.tipo),
  ]);

  const kpis = calcularKPIs(totais);
  const etapas = calcularEtapasFunil(totais);

  const campanhasChart = campanhas.slice(0, 8).map((c: any) => ({
    nome: (c.nome ?? '').substring(0, 18),
    resultados: c.resultados ?? 0,
    cpr: Number(c.cpr ?? 0),
  }));

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
          Visao geral do funil
        </h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KPICard
            label="Investimento"
            valor={formatBRL(kpis.investimento)}
            cor="dark"
            icon={DollarSign}
          />
          <KPICard
            label="Leads"
            valor={formatNumber(kpis.totalLeads)}
            hint={`CPL ${formatBRL(kpis.cpl)}`}
            cor="medium"
            icon={Users}
          />
          <KPICard
            label="Contratos assinados"
            valor={formatNumber(kpis.contratosAssinados)}
            hint={`${formatNumber(kpis.contratosEnviados)} enviados`}
            cor="purple"
            icon={FileSignature}
          />
          <KPICard
            label="CAC"
            valor={formatBRL(kpis.cac)}
            cor="orange"
            icon={Target}
          />
          <KPICard
            label="ROI entrada"
            valor={formatPercent(kpis.roiEntrada / 100, 0)}
            hint={formatBRL(kpis.receitaEntrada)}
            cor="green"
            icon={TrendingUp}
          />
          <KPICard
            label="Receita potencial"
            valor={formatBRL(kpis.receitaPotencial)}
            hint={`ROI ${formatPercent(kpis.roiPotencial / 100, 0)}`}
            cor="pink"
            icon={PiggyBank}
          />
          <KPICard
            label="Taxa atendimento"
            valor={formatPercent(
              totais.leadsAtendidos / Math.max(totais.leadsWts, 1),
              1,
            )}
            hint={`${formatNumber(totais.leadsAtendidos)} atendidos`}
            cor="medium"
          />
          <KPICard
            label="Conv. lead -> contrato"
            valor={formatPercent(
              totais.contratosAssinados / Math.max(totais.leadsWts, 1),
              1,
            )}
            cor="green"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Funil comercial</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cada etapa mostra volume e taxa de conversao em relacao a anterior.
              </p>
            </CardHeader>
            <CardContent>
              <FunilChart etapas={etapas} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Resumo do periodo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Linha label="Impressoes" valor={formatNumber(totais.impressoes)} />
              <Linha label="Alcance" valor={formatNumber(totais.alcance)} />
              <Linha
                label="Conversas Meta"
                valor={formatNumber(totais.conversasMeta)}
              />
              <Linha
                label="Reunioes agendadas"
                valor={formatNumber(totais.reunioesAgendadas)}
              />
              <Linha
                label="Taxa agendamento"
                valor={formatPercent(
                  totais.reunioesAgendadas / Math.max(totais.leadsAtendidos, 1),
                )}
              />
              <Linha
                label="Taxa assinatura"
                valor={formatPercent(
                  totais.contratosAssinados / Math.max(totais.contratosEnviados, 1),
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Leads por dia</CardTitle>
              <p className="text-xs text-muted-foreground">
                Empilhado por tipo de campanha.
              </p>
            </CardHeader>
            <CardContent>
              {leadsPorDia.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sem leads no periodo selecionado.
                </p>
              ) : (
                <LinhasChart
                  data={leadsPorDia}
                  xKey="dia"
                  linhas={[
                    {
                      key: 'APP_MOBILIDADE',
                      label: TIPO_CAMPANHA_LABELS.APP_MOBILIDADE,
                      cor: TIPO_CAMPANHA_CORES.APP_MOBILIDADE,
                    },
                    {
                      key: 'SERVIDOR_PUBLICO',
                      label: TIPO_CAMPANHA_LABELS.SERVIDOR_PUBLICO,
                      cor: TIPO_CAMPANHA_CORES.SERVIDOR_PUBLICO,
                    },
                    {
                      key: 'NAO_CLASSIFICADO',
                      label: TIPO_CAMPANHA_LABELS.NAO_CLASSIFICADO,
                      cor: TIPO_CAMPANHA_CORES.NAO_CLASSIFICADO,
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Campanhas: resultados x CPR</CardTitle>
              <p className="text-xs text-muted-foreground">
                Top 8 por gasto.
              </p>
            </CardHeader>
            <CardContent>
              {campanhasChart.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sem campanhas sincronizadas.
                </p>
              ) : (
                <BarrasChart
                  data={campanhasChart}
                  xKey="nome"
                  dualAxis
                  series={[
                    {
                      key: 'resultados',
                      label: 'Resultados',
                      cor: '#1D9E75',
                      yAxisId: 'left',
                    },
                    {
                      key: 'cpr',
                      label: 'CPR (R$)',
                      cor: '#EF9F27',
                      yAxisId: 'right',
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-brand-dark">{valor}</span>
    </div>
  );
}
