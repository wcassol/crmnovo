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
  buscarCasosDoCliente,
  buscarClientePorId,
  buscarDocumentosDoCliente,
  buscarNotasDoCliente,
  buscarTagsDoCliente,
} from '@/lib/queries';
import {
  formatBRL,
  formatCpfCnpj,
  formatDate,
  formatPhone,
} from '@/lib/utils';
import { FASE_CASO_LABELS, STATUS_CASO_LABELS } from '@/lib/types';
import { NotasLista } from '@/components/dashboard/notas-lista';
import { TagsLista } from '@/components/dashboard/tags-lista';
import { DocumentosLista } from '@/components/dashboard/documentos-lista';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ClienteDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const supabase = createClient();
  const cliente = await buscarClientePorId(supabase, id);
  if (!cliente) notFound();
  const [casos, notas, tags, documentos] = await Promise.all([
    buscarCasosDoCliente(supabase, id),
    buscarNotasDoCliente(supabase, id),
    buscarTagsDoCliente(supabase, id),
    buscarDocumentosDoCliente(supabase, id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/clientes"
          className="text-xs text-muted-foreground hover:underline"
        >
          Clientes
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-brand-dark">{cliente.nome}</h1>
        <Badge variant={cliente.tipo_pessoa === 'PJ' ? 'default' : 'outline'}>
          {cliente.tipo_pessoa}
        </Badge>
        <TagsLista tags={tags} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Linha label="CPF/CNPJ" value={formatCpfCnpj(cliente.cpf_cnpj)} />
            <Linha label="RG" value={cliente.rg ?? '-'} />
            <Linha
              label="Nascimento"
              value={cliente.data_nascimento ? formatDate(cliente.data_nascimento) : '-'}
            />
            <Linha label="Estado civil" value={cliente.estado_civil ?? '-'} />
            <Linha label="Profissao" value={cliente.profissao ?? '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Linha label="Email" value={cliente.email ?? '-'} />
            <Linha label="Telefone" value={formatPhone(cliente.telefone)} />
            <Linha
              label="Endereco"
              value={
                cliente.endereco
                  ? `${cliente.endereco}, ${cliente.numero ?? 's/n'}` +
                    (cliente.complemento ? `, ${cliente.complemento}` : '') +
                    (cliente.bairro ? `, ${cliente.bairro}` : '')
                  : '-'
              }
            />
            <Linha
              label="Cidade/UF"
              value={cliente.cidade ? `${cliente.cidade}/${cliente.uf ?? '-'}` : '-'}
            />
            <Linha label="CEP" value={cliente.cep ?? '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Linha label="PIX (tipo)" value={cliente.pix_tipo ?? '-'} />
            <Linha label="PIX (chave)" value={cliente.pix_chave ?? '-'} />
          </CardContent>
        </Card>

        {cliente.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Observacoes</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {cliente.observacoes}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Casos ({casos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {casos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este cliente ainda nao tem casos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor causa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/casos/${c.id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {c.titulo}
                      </Link>
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

      <div className="grid gap-4 md:grid-cols-2">
        <NotasLista notas={notas} />
        <DocumentosLista documentos={documentos} />
      </div>
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
