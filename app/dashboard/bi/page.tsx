import Link from 'next/link';
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
import { createClient } from '@/lib/supabase/server';
import {
  buscarBiForecast,
  buscarBiFunilJuridico,
  buscarBiLtvCliente,
  buscarBiProdutividade,
  buscarBiTaxaExito,
  buscarBiTempoTramitacao,
} from '@/lib/queries';
import { formatBRL, formatNumber, formatPercent } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BiPage() {
  const supabase = createClient();
  const [taxaExito, tempo, produtividade, ltv, forecast, funil] = await Promise.all([
    buscarBiTaxaExito(supabase),
    buscarBiTempoTramitacao(supabase),
    buscarBiProdutividade(supabase),
    buscarBiLtvCliente(supabase, 10),
    buscarBiForecast(supabase),
    buscarBiFunilJuridico(supabase),
  ]);

  const forecastTotal = forecast.reduce(
    (s, f) => s + Number(f.forecast_ponderado ?? 0),
    0,
  );
  const valorProvavelTotal = forecast.reduce(
    (s, f) => s + Number(f.valor_provavel_total ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">BI juridico</h1>
        <p className="text-sm text-muted-foreground">
          Taxa de exito, tempo de tramitacao, produtividade da equipe,
          forecast de receita e LTV de clientes.
        </p>
      </div>

      {funil && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Total leads"
            valor={formatNumber(funil.total_leads)}
            cor="text-brand-medium"
          />
          <KPI
            label="Lead -> Cliente"
            valor={formatPercent(Number(funil.taxa_lead_cliente))}
            cor="text-brand-purple"
            sub={`${formatNumber(funil.total_clientes)} clientes`}
          />
          <KPI
            label="Casos por cliente"
            valor={Number(funil.casos_por_cliente).toFixed(2)}
            cor="text-brand-orange"
            sub={`${formatNumber(funil.total_casos)} casos`}
          />
          <KPI
            label="Taxa de exito geral"
            valor={formatPercent(Number(funil.taxa_exito_geral))}
            cor="text-brand-green"
            sub={`${funil.casos_ganhos} ganhos / ${funil.casos_perdidos} perdidos`}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Forecast de receita ponderado: {formatBRL(forecastTotal)}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (de {formatBRL(valorProvavelTotal)} em valor provavel total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {forecast.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem casos ativos com valor provavel definido.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de acao</TableHead>
                  <TableHead className="text-right">Casos ativos</TableHead>
                  <TableHead className="text-right">Valor provavel</TableHead>
                  <TableHead className="text-right">Taxa exito</TableHead>
                  <TableHead className="text-right">Forecast ponderado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.map((f) => (
                  <TableRow key={f.tipo_acao}>
                    <TableCell className="font-medium">{f.tipo_acao}</TableCell>
                    <TableCell className="text-right">{f.qtd_casos_ativos}</TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(f.valor_provavel_total))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(Number(f.taxa_exito_historica))}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-brand-green">
                      {formatBRL(Number(f.forecast_ponderado))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa de exito por tipo de acao</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {taxaExito.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem dados ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">Perdidos</TableHead>
                    <TableHead className="text-right">Taxa exito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxaExito.map((t) => (
                    <TableRow key={t.tipo_acao}>
                      <TableCell className="font-medium">{t.tipo_acao}</TableCell>
                      <TableCell className="text-right">{t.total_casos}</TableCell>
                      <TableCell className="text-right text-brand-green">
                        {t.ganhos}
                      </TableCell>
                      <TableCell className="text-right text-brand-red">
                        {t.perdidos}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {t.taxa_exito !== null ? formatPercent(Number(t.taxa_exito)) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tempo de tramitacao (dias)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {tempo.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum caso encerrado com data de distribuicao e transito.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Casos</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Mediana</TableHead>
                    <TableHead className="text-right">Media</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tempo.map((t) => (
                    <TableRow key={t.tipo_acao}>
                      <TableCell className="font-medium">{t.tipo_acao}</TableCell>
                      <TableCell className="text-right">{t.qtd_casos}</TableCell>
                      <TableCell className="text-right">{t.dias_minimo ?? '-'}</TableCell>
                      <TableCell className="text-right">{t.dias_mediana ?? '-'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {t.dias_medio ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">{t.dias_maximo ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Produtividade da equipe</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {produtividade.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Cadastre membros (advogados/estagiarios) para ver a produtividade.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>OAB</TableHead>
                  <TableHead className="text-right">Casos ativos</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Perdidos</TableHead>
                  <TableHead className="text-right">Taxa exito</TableHead>
                  <TableHead className="text-right">Audiencias 30d</TableHead>
                  <TableHead className="text-right">Prazos 7d</TableHead>
                  <TableHead className="text-right">Recuperado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtividade.map((p) => (
                  <TableRow key={p.membro_id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{p.oab ?? '-'}</TableCell>
                    <TableCell className="text-right">{p.casos_ativos}</TableCell>
                    <TableCell className="text-right text-brand-green">
                      {p.casos_ganhos}
                    </TableCell>
                    <TableCell className="text-right text-brand-red">
                      {p.casos_perdidos}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.taxa_exito !== null ? formatPercent(Number(p.taxa_exito)) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.audiencias_proximas_30d}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.prazos_proximos_7d > 0 ? (
                        <Badge className="bg-brand-orange text-white">
                          {p.prazos_proximos_7d}
                        </Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(p.valor_recuperado))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 10 LTV de clientes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {ltv.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem clientes com casos ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Casos</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Contratado</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ltv.map((c) => (
                  <TableRow key={c.cliente_id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/clientes/${c.cliente_id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {c.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{c.qtd_casos}</TableCell>
                    <TableCell className="text-right text-brand-green">
                      {c.casos_ganhos}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(c.honorarios_contratados))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBRL(Number(c.honorarios_pagos))}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {c.dias_relacionamento}d
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  label,
  valor,
  cor,
  sub,
}: {
  label: string;
  valor: string;
  cor: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold ${cor}`}>{valor}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}
