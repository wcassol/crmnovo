import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  buscarAudienciasDoCaso,
  buscarCasoPorId,
  buscarDocumentosDoCaso,
  buscarHonorariosDoCaso,
  buscarNotasDoCaso,
  buscarPrazosDoCaso,
  buscarTagsDoCaso,
} from '@/lib/queries';
import { formatBRL, formatDate, formatDateTime } from '@/lib/utils';
import {
  FASE_CASO_LABELS,
  STATUS_CASO_LABELS,
  STATUS_HONORARIO_LABELS,
  TIPO_HONORARIO_LABELS,
} from '@/lib/types';
import { NotasLista } from '@/components/dashboard/notas-lista';
import { TagsLista } from '@/components/dashboard/tags-lista';
import { DocumentosLista } from '@/components/dashboard/documentos-lista';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CasoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const supabase = createClient();
  const caso = await buscarCasoPorId(supabase, id);
  if (!caso) notFound();
  const [honorarios, audiencias, prazos, notas, tags, documentos] = await Promise.all([
    buscarHonorariosDoCaso(supabase, id),
    buscarAudienciasDoCaso(supabase, id),
    buscarPrazosDoCaso(supabase, id),
    buscarNotasDoCaso(supabase, id),
    buscarTagsDoCaso(supabase, id),
    buscarDocumentosDoCaso(supabase, id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/casos"
          className="text-xs text-muted-foreground hover:underline"
        >
          Casos
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-brand-dark">{caso.titulo}</h1>
        <Badge variant="outline">{FASE_CASO_LABELS[caso.fase]}</Badge>
        <Badge>{STATUS_CASO_LABELS[caso.status]}</Badge>
        <TagsLista tags={tags} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dados do caso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {caso.clientes && (
              <Linha
                label="Cliente"
                value={
                  <Link
                    href={`/dashboard/clientes/${caso.clientes.id}`}
                    className="text-brand-dark hover:underline"
                  >
                    {caso.clientes.nome}
                  </Link>
                }
              />
            )}
            <Linha label="Tipo de acao" value={caso.tipo_acao ?? '-'} />
            <Linha label="Area" value={caso.area ?? '-'} />
            <Linha
              label="CNJ"
              value={
                caso.numero_cnj ? (
                  <span className="font-mono">{caso.numero_cnj}</span>
                ) : (
                  '-'
                )
              }
            />
            <Linha label="Vara" value={caso.vara ?? '-'} />
            <Linha
              label="Comarca/UF"
              value={caso.comarca ? `${caso.comarca}/${caso.uf ?? '-'}` : '-'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Valores e datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Linha
              label="Valor da causa"
              value={caso.valor_causa ? formatBRL(Number(caso.valor_causa)) : '-'}
            />
            <Linha
              label="Provavel exito"
              value={
                caso.valor_provavel_exito
                  ? formatBRL(Number(caso.valor_provavel_exito))
                  : '-'
              }
            />
            <Linha
              label="Distribuicao"
              value={caso.data_distribuicao ? formatDate(caso.data_distribuicao) : '-'}
            />
            <Linha
              label="Sentenca"
              value={caso.data_sentenca ? formatDate(caso.data_sentenca) : '-'}
            />
            <Linha
              label="Transito em julgado"
              value={caso.data_transito ? formatDate(caso.data_transito) : '-'}
            />
            <Linha label="Resultado" value={caso.resultado ?? '-'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Honorarios ({honorarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {honorarios.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem honorarios registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead className="text-right">Valor total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {honorarios.map((h) => {
                  const pagas = (h.parcelas ?? []).filter((p) => p.pago_em).length;
                  const total = (h.parcelas ?? []).length;
                  return (
                    <TableRow key={h.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {TIPO_HONORARIO_LABELS[h.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{h.descricao ?? '-'}</TableCell>
                      <TableCell>
                        <Badge>{STATUS_HONORARIO_LABELS[h.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {total === 0 ? '-' : `${pagas} / ${total}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBRL(Number(h.valor_total))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audiencias ({audiencias.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {audiencias.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem audiencias agendadas.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {audiencias.map((a) => (
                  <li key={a.id} className="rounded border bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.tipo ?? 'Audiencia'}</span>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(a.data_hora)} - {a.modalidade}
                    </div>
                    {a.local_endereco && (
                      <div className="text-xs">{a.local_endereco}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prazos ({prazos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {prazos.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem prazos cadastrados.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {prazos.map((p) => {
                  const concluido = !!p.concluido_em;
                  const venceEm = Math.ceil(
                    (new Date(p.data_fatal).getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000),
                  );
                  return (
                    <li key={p.id} className="rounded border bg-white p-2">
                      <div className="flex items-center justify-between">
                        <span className={concluido ? 'line-through' : 'font-medium'}>
                          {p.descricao}
                        </span>
                        <Badge variant={p.tipo === 'fatal' ? 'default' : 'outline'}>
                          {p.tipo}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(p.data_fatal)}
                        {!concluido && (
                          <span
                            className={
                              venceEm < 0
                                ? 'ml-2 text-brand-red'
                                : venceEm <= 3
                                ? 'ml-2 text-brand-orange'
                                : 'ml-2'
                            }
                          >
                            {venceEm < 0
                              ? `${Math.abs(venceEm)} dias vencido`
                              : venceEm === 0
                              ? 'vence hoje'
                              : `em ${venceEm} dias`}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NotasLista notas={notas} />
        <DocumentosLista documentos={documentos} />
      </div>

      {caso.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Observacoes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {caso.observacoes}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
