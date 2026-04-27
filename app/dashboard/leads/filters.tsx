'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface Props {
  status: string;
  prefixo: string;
  fonte: string;
  busca: string;
}

export function LeadsFilters({ status, prefixo, fonte, busca }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [, startTransition] = useTransition();
  const [buscaLocal, setBuscaLocal] = useState(busca);

  function update(updates: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'TODOS') params.delete(k);
      else params.set(k, v);
    }
    params.delete('offset');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (buscaLocal !== busca) update({ busca: buscaLocal });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaLocal]);

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Input
        placeholder="Buscar por nome, telefone ou mensagem..."
        value={buscaLocal}
        onChange={(e) => setBuscaLocal(e.target.value)}
        className="h-9 max-w-xs"
      />
      <Select
        value={status}
        onChange={(e) => update({ status: e.target.value })}
        className="h-9 w-auto"
      >
        <option value="TODOS">Todos status</option>
        <option value="Pendente">Pendente</option>
        <option value="Em andamento">Em andamento</option>
        <option value="Concluido">Concluido</option>
      </Select>
      <Select
        value={prefixo}
        onChange={(e) => update({ prefixo: e.target.value })}
        className="h-9 w-auto"
      >
        <option value="TODOS">Todos prefixos</option>
        <option value="PP">PP</option>
        <option value="ABE">ABE</option>
        <option value="SEG">SEG</option>
      </Select>
      <Select
        value={fonte}
        onChange={(e) => update({ fonte: e.target.value })}
        className="h-9 w-auto"
      >
        <option value="TODOS">Todas fontes</option>
        <option value="INSTAGRAM">Instagram</option>
        <option value="FACEBOOK">Facebook</option>
      </Select>
    </div>
  );
}
