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
import { createClient } from '@/lib/supabase/server';
import { buscarClientes } from '@/lib/queries';
import { formatPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const busca = getStr(searchParams.busca);
  const { rows, total } = await buscarClientes(supabase, { busca, limit: 100 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {total} clientes cadastrados; busca por nome, CPF/CNPJ, telefone ou e-mail.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <Input
            type="search"
            name="busca"
            placeholder="Buscar..."
            defaultValue={busca ?? ''}
            className="w-full md:w-64"
          />
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado. Os clientes sao criados automaticamente
              quando um contrato e assinado, ou podem ser cadastrados manualmente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Responsavel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/clientes/${c.id}`}
                        className="font-medium text-brand-dark hover:underline"
                      >
                        {c.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.tipo_pessoa === 'PJ' ? 'default' : 'outline'}>
                        {c.tipo_pessoa}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.cpf_cnpj ?? '-'}
                    </TableCell>
                    <TableCell>{formatPhone(c.telefone)}</TableCell>
                    <TableCell>
                      {c.cidade ? `${c.cidade}/${c.uf ?? '-'}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.membro_responsavel_id ?? '-'}
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
