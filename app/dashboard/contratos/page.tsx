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
import { buscarContratos } from '@/lib/queries';
import {
  formatBRL,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatTempoMin,
} from '@/lib/utils';
import { TIPO_CAMPANHA_LABELS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filtros = parseFiltros(searchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const contratos = await buscarContratos(supabase, {
    from: filtros.from,
    to: filtros.to,
    tipo: filtros.tipo,
  });

  const total = contratos.length;
  const assinados = contratos.filter((c: any) => c.status === 'Assinado').length;
  const emCurso = contratos.filter((c: any) => c.status === 'Em curso').length;
  const recusados = contratos.filter(
    (c: any) => c.status === 'Recusado' || c.status === 'Expirado',
  ).length;
  const tempos = contratos
    .map((c: any) => c.tempo_para_assinar_min)
    .filter((t: any): t is number => t !== null && t !== undefined)
    .sort((a: number, b: number) => a - b);
  const mediano = tempos.length > 0 ? tempos[Math.floor(tempos.length / 2)] : null;

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
          Contratos
        </h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MiniCard label="Total" valor={formatNumber(total)} cor="dark" />
          <MiniCard
            label="Assinados"
            valor={formatNumber(assinados)}
            cor="green"
          />
          <MiniCard
            label="Em curso"
            valor={formatNumber(emCurso)}
            cor="orange"
          />
          <MiniCard
            label="Taxa assinatura"
            valor={formatPercent(assinados / Math.max(total, 1))}
            cor="medium"
          />
          <MiniCard
            label="Tempo mediano"
            valor={formatTempoMin(mediano)}
            cor="purple"
          />
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle>{contratos.length} contratos no periodo</CardTitle>
          </CardHeader>
          <CardContent>
            {contratos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum contrato encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead>Assinado</TableHead>
                    <TableHead>Tempo p/ assinar</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-[280px] truncate font-medium">
                        {c.nome_documento}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TIPO_CAMPANHA_LABELS[c.tipo_contrato] ?? c.tipo_contrato}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusContratoBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(c.data_criacao)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(c.data_assinatura)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTempoMin(c.tempo_para_assinar_min)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBRL(Number(c.valor_entrada ?? 399))}
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
  cor,
}: {
  label: string;
  valor: string;
  cor: 'dark' | 'green' | 'orange' | 'medium' | 'purple';
}) {
  const corMap = {
    dark: 'text-brand-dark',
    green: 'text-brand-green',
    orange: 'text-brand-orange',
    medium: 'text-brand-medium',
    purple: 'text-brand-purple',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 text-xl font-bold ${corMap[cor]}`}>{valor}</p>
      </CardContent>
    </Card>
  );
}

function StatusContratoBadge({ status }: { status: string | null }) {
  if (status === 'Assinado') return <Badge variant="success">Assinado</Badge>;
  if (status === 'Em curso') return <Badge variant="warning">Em curso</Badge>;
  if (status === 'Recusado') return <Badge variant="destructive">Recusado</Badge>;
  if (status === 'Expirado') return <Badge variant="destructive">Expirado</Badge>;
  return <Badge variant="outline">{status ?? ','}</Badge>;
}
