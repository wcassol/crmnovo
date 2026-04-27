import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardHeader } from '@/components/dashboard/header';
import { LinhasChart } from '@/components/dashboard/line-chart';
import { createClient } from '@/lib/supabase/server';
import { parseFiltros } from '@/lib/filtros';
import { buscarCriativosResumo } from '@/lib/queries';
import { formatNumber, formatPercent } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORES = {
  PP: '#1D9E75',
  ABE: '#1D5FA5',
  SEG: '#7F77DD',
  SEM_PREFIXO: '#9CA3AF',
};

const LABELS = {
  PP: 'PP - Padrao',
  ABE: 'ABE - Abertura',
  SEG: 'SEG - Segmentado',
  SEM_PREFIXO: 'Sem prefixo',
};

export default async function CriativosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { cards, evolucao } = await buscarCriativosResumo(supabase, {
    from: filtros.from,
    to: filtros.to,
  });

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
          Criativos PP / ABE / SEG
        </h1>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => {
            const cor =
              CORES[card.prefixo as keyof typeof CORES] ?? CORES.SEM_PREFIXO;
            return (
              <Card key={card.prefixo}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: cor }}
                    />
                    {LABELS[card.prefixo as keyof typeof LABELS] ?? card.prefixo}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Linha label="Total leads" valor={formatNumber(card.total)} />
                  <Linha
                    label="Atendidos"
                    valor={`${formatNumber(card.atendidos)} (${formatPercent(card.taxaAtendimento)})`}
                  />
                  <Linha
                    label="Media/dia"
                    valor={card.mediaDia.toFixed(1)}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle>Evolucao diaria por criativo</CardTitle>
          </CardHeader>
          <CardContent>
            {evolucao.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sem leads no periodo selecionado.
              </p>
            ) : (
              <LinhasChart
                data={evolucao}
                xKey="dia"
                height={320}
                linhas={[
                  { key: 'PP', label: LABELS.PP, cor: CORES.PP },
                  { key: 'ABE', label: LABELS.ABE, cor: CORES.ABE },
                  { key: 'SEG', label: LABELS.SEG, cor: CORES.SEG },
                  {
                    key: 'SEM_PREFIXO',
                    label: LABELS.SEM_PREFIXO,
                    cor: CORES.SEM_PREFIXO,
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-brand-dark">{valor}</span>
    </div>
  );
}
