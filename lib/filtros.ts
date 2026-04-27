import { dateRangeMes } from './utils';
import { TipoCampanha } from './types';

export interface FiltrosURL {
  from: string;
  to: string;
  tipo: TipoCampanha | 'TODOS';
}

export function parseFiltros(searchParams: Record<string, string | string[] | undefined>): FiltrosURL {
  const padrao = dateRangeMes();
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const from = get('from') ?? padrao.from;
  const to = get('to') ?? padrao.to;
  const tipo = (get('tipo') ?? 'TODOS') as FiltrosURL['tipo'];
  return { from, to, tipo };
}
