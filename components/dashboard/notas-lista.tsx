import { Pin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { Nota } from '@/lib/types';

interface Props {
  notas: (Nota & { autor?: { id: number; nome: string } | null })[];
  emptyLabel?: string;
}

export function NotasLista({ notas, emptyLabel = 'Sem notas registradas.' }: Props) {
  if (notas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Notas ({notas.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notas.map((n) => (
          <div
            key={n.id}
            className={
              'rounded-md border bg-white p-3 ' +
              (n.fixada ? 'border-brand-orange' : '')
            }
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {n.fixada && <Pin className="h-3 w-3 text-brand-orange" />}
                {n.autor?.nome ?? 'Sistema'}
              </span>
              <span>{formatDateTime(n.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{n.conteudo}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
