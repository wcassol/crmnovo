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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/server';
import {
  buscarInadimplencia,
  buscarParcelas,
  buscarReceitaPorMes,
  buscarTotaisFinanceiroJuridico,
} from '@/lib/queries';
import { formatBRL, formatDate, formatPhone } from '@/lib/utils';
import {
  SITUACAO_PARCELA_LABELS,
  SituacaoParcela,
  TIPO_HONORARIO_LABELS,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

const SITUACAO_BADGES: Record<SituacaoParcela, string> = {
  paga: 'bg-brand-green text-white',
  a_vencer: 'bg-brand-medium text-white',
  vence_hoje: 'bg-brand-orange text-white',
  vencida: 'bg-brand-red text-white',
};

export default async function HonorariosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const situacao =
    (getStr(searchParams.situacao) as
      | 'paga'
      | 'a_vencer'
      | 'vence_hoje'
      | 'vencida'
      | 'TODAS'
      | undefined) ?? 'TODAS';
  const busca = getStr(searchParams.busca);

  const [{ rows, total }, totais, receita, inadimplencia] = await Promise.all([
    buscarParcelas(supabase, { situacao, busca, limit: 200 }),
    buscarTotaisFinanceiroJuridico(supabase),
    buscarReceitaPorMes(supabase),
    buscarInadimplencia(supabase, 10),
  ]);

  const proximos = receita
    .filter((m) => new Date(m.mes) >= new Date(new Date().toISOString().slice(0, 7) + '-01'))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">Honorarios</h1>
        <p className="text-sm text-muted-foreground">
          Parcelas a receber, inadimplencia e projecao de receita.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          label="Recebido"
          valor={totais.recebido}
          cor="text-brand-green"
        />
        <KPI label="A vencer" valor={totais.a_vencer} cor="text-brand-medium" />
        <KPI label="Vence hoje" valor={totais.vence_hoje} cor="text-brand-orange" />
        <KPI label="Vencido" valor={totais.vencido} cor="text-brand-red" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Projecao de receita (proximos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {proximos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem parcelas projetadas no periodo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Parcelas</TableHead>
                    <TableHead className="text-right">A vencer</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proximos.map((m) => (
                    <TableRow key={m.mes_ref}>
                      <TableCell className="font-medium">
                        {new Date(m.mes).toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{m.qtd_parcelas}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(Number(m.valor_a_vencer ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-brand-green">
                        {formatBRL(Number(m.valor_pago ?? 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBRL(Number(m.valor_total ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Inadimplencia ({inadimplencia.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {inadimplencia.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem inadimplencia no momento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Parcelas vencidas</TableHead>
                  <TableHead>Mais antiga</TableHead>
                  <TableHead className="text-right">Total vencido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inadimplencia.map((i) => (
                  <TableRow key={i.cliente_id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/clientes/${i.cliente_id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {i.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{formatPhone(i.telefone)}</TableCell>
                    <TableCell>
                      {i.qtd_parcelas_vencidas} ({i.max_dias_atraso}d max)
                    </TableCell>
                    <TableCell>{formatDate(i.parcela_mais_antiga)}</TableCell>
                    <TableCell className="text-right font-semibold text-brand-red">
                      {formatBRL(Number(i.valor_total_vencido))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm">Parcelas ({total})</CardTitle>
          <form className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              name="busca"
              placeholder="Cliente ou caso..."
              defaultValue={busca ?? ''}
              className="w-full md:w-48"
            />
            <Select name="situacao" defaultValue={situacao} className="w-full md:w-40">
              <option value="TODAS">Todas as situacoes</option>
              {Object.entries(SITUACAO_PARCELA_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma parcela encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Caso</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situacao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/clientes/${p.cliente_id}`}
                        className="hover:underline"
                      >
                        {p.cliente_nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/casos/${p.caso_id}`}
                        className="text-xs hover:underline"
                      >
                        {p.caso_titulo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPO_HONORARIO_LABELS[p.tipo_honorario]}
                      </Badge>
                    </TableCell>
                    <TableCell>#{p.numero}</TableCell>
                    <TableCell>
                      {formatDate(p.vencimento)}
                      {p.situacao === 'vencida' && (
                        <span className="ml-1 text-xs text-brand-red">
                          ({p.dias_atraso}d)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={SITUACAO_BADGES[p.situacao]}>
                        {SITUACAO_PARCELA_LABELS[p.situacao]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(p.valor))}
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

function KPI({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold ${cor}`}>{formatBRL(valor)}</span>
      </CardContent>
    </Card>
  );
}
