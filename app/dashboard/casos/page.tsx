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
import { buscarCasos } from '@/lib/queries';
import { formatBRL, formatDate } from '@/lib/utils';
import { FASE_CASO_LABELS, STATUS_CASO_LABELS } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function CasosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const busca = getStr(searchParams.busca);
  const status = getStr(searchParams.status) ?? 'TODOS';
  const fase = getStr(searchParams.fase) ?? 'TODAS';
  const { rows, total } = await buscarCasos(supabase, {
    busca,
    status,
    fase,
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">Casos</h1>
        <p className="text-sm text-muted-foreground">
          {total} casos cadastrados; busca por titulo ou numero CNJ.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-3">
        <Input
          type="search"
          name="busca"
          placeholder="Titulo ou CNJ..."
          defaultValue={busca ?? ''}
          className="w-full md:w-64"
        />
        <Select name="status" defaultValue={status} className="w-full md:w-40">
          <option value="TODOS">Todos status</option>
          {Object.entries(STATUS_CASO_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Select name="fase" defaultValue={fase} className="w-full md:w-44">
          <option value="TODAS">Todas as fases</option>
          {Object.entries(FASE_CASO_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum caso encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caso</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Distribuicao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/casos/${c.id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {c.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.clientes ? (
                        <Link
                          href={`/dashboard/clientes/${c.clientes.id}`}
                          className="hover:underline"
                        >
                          {c.clientes.nome}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.numero_cnj ?? '-'}
                    </TableCell>
                    <TableCell>{c.tipo_acao ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{FASE_CASO_LABELS[c.fase]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{STATUS_CASO_LABELS[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.data_distribuicao ? formatDate(c.data_distribuicao) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.valor_causa ? formatBRL(Number(c.valor_causa)) : '-'}
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
