import { FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Documento } from '@/lib/types';

interface Props {
  documentos: Documento[];
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function DocumentosLista({ documentos }: Props) {
  if (documentos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem documentos anexados.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Documentos ({documentos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {documentos.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-white p-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand-medium" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.categoria && <Badge variant="outline">{d.categoria}</Badge>}
                    <span className="ml-2">{formatBytes(d.tamanho_bytes)}</span>
                    <span className="ml-2">{formatDateTime(d.created_at)}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
