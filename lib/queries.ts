import { SupabaseClient } from '@supabase/supabase-js';
import {
  Audiencia,
  Caso,
  Cliente,
  Honorario,
  Parcela,
  Prazo,
  TipoCampanha,
} from './types';
import { calcularKPIs, FunilTotais } from './metrics';

export interface PeriodoFiltro {
  from: string;
  to: string;
  tipoCampanha?: TipoCampanha | 'TODOS';
}

function aplicaTipoFiltro<T>(query: any, tipo?: TipoCampanha | 'TODOS', col = 'tipo_campanha') {
  if (!tipo || tipo === 'TODOS') return query;
  return query.eq(col, tipo);
}

export async function buscarFunilTotais(
  supabase: SupabaseClient,
  filtro: PeriodoFiltro,
): Promise<FunilTotais> {
  const { from, to, tipoCampanha } = filtro;

  const [
    leadsResp,
    leadsAtendidosResp,
    reunioesResp,
    contratosEnviadosResp,
    contratosAssinadosResp,
    campanhasResp,
  ] = await Promise.all([
    aplicaTipoFiltro(
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('data_criacao', from)
        .lte('data_criacao', to),
      tipoCampanha,
    ),
    aplicaTipoFiltro(
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('data_criacao', from)
        .lte('data_criacao', to)
        .eq('status', 'Concluido'),
      tipoCampanha,
    ),
    aplicaTipoFiltro(
      supabase
        .from('reunioes')
        .select('id', { count: 'exact', head: true })
        .gte('data_hora', from)
        .lte('data_hora', to)
        .neq('status', 'cancelada'),
      tipoCampanha,
    ),
    aplicaTipoFiltro(
      supabase
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .gte('data_criacao', from)
        .lte('data_criacao', to),
      tipoCampanha,
      'tipo_contrato',
    ),
    aplicaTipoFiltro(
      supabase
        .from('contratos')
        .select('id', { count: 'exact', head: true })
        .gte('data_criacao', from)
        .lte('data_criacao', to)
        .eq('status', 'Assinado'),
      tipoCampanha,
      'tipo_contrato',
    ),
    aplicaTipoFiltro(
      supabase
        .from('campanhas_meta')
        .select('impressoes, alcance, resultados, gasto')
        .gte('data_inicio', from)
        .lte('data_inicio', to),
      tipoCampanha,
      'tipo',
    ),
  ]);

  const camp = campanhasResp.data ?? [];
  const impressoes = camp.reduce((s: number, c: any) => s + (c.impressoes ?? 0), 0);
  const alcance = camp.reduce((s: number, c: any) => s + (c.alcance ?? 0), 0);
  const conversasMeta = camp.reduce((s: number, c: any) => s + (c.resultados ?? 0), 0);
  const gastoMeta = camp.reduce((s: number, c: any) => s + Number(c.gasto ?? 0), 0);

  return {
    impressoes,
    alcance,
    conversasMeta,
    leadsWts: leadsResp.count ?? 0,
    leadsAtendidos: leadsAtendidosResp.count ?? 0,
    reunioesAgendadas: reunioesResp.count ?? 0,
    contratosEnviados: contratosEnviadosResp.count ?? 0,
    contratosAssinados: contratosAssinadosResp.count ?? 0,
    gastoMeta,
  };
}

export async function buscarKPIs(supabase: SupabaseClient, filtro: PeriodoFiltro) {
  const totais = await buscarFunilTotais(supabase, filtro);
  return { totais, kpis: calcularKPIs(totais) };
}

export async function buscarLeadsPorDia(
  supabase: SupabaseClient,
  filtro: PeriodoFiltro,
) {
  const { data } = await supabase
    .from('leads')
    .select('data_criacao, tipo_campanha, status')
    .gte('data_criacao', filtro.from)
    .lte('data_criacao', filtro.to)
    .not('data_criacao', 'is', null);

  const buckets = new Map<string, Record<string, number>>();
  for (const row of data ?? []) {
    if (!row.data_criacao) continue;
    const dia = row.data_criacao.slice(0, 10);
    const tipo = row.tipo_campanha ?? 'NAO_CLASSIFICADO';
    if (!buckets.has(dia)) {
      buckets.set(dia, {
        APP_MOBILIDADE: 0,
        SERVIDOR_PUBLICO: 0,
        NAO_CLASSIFICADO: 0,
      });
    }
    const b = buckets.get(dia)!;
    b[tipo] = (b[tipo] ?? 0) + 1;
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, counts]) => ({ dia, ...counts }));
}

export async function buscarCampanhas(
  supabase: SupabaseClient,
  tipo?: TipoCampanha | 'TODOS',
) {
  let q = supabase
    .from('campanhas_meta')
    .select('*')
    .order('gasto', { ascending: false });
  if (tipo && tipo !== 'TODOS') q = q.eq('tipo', tipo);
  const { data } = await q;
  return data ?? [];
}

export async function buscarLeads(
  supabase: SupabaseClient,
  filtros: {
    from: string;
    to: string;
    status?: string;
    tipo?: string;
    prefixo?: string;
    fonte?: string;
    busca?: string;
    limit?: number;
    offset?: number;
  },
) {
  let q = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .gte('data_criacao', filtros.from)
    .lte('data_criacao', filtros.to)
    .order('data_criacao', { ascending: false });

  if (filtros.status && filtros.status !== 'TODOS') q = q.eq('status', filtros.status);
  if (filtros.tipo && filtros.tipo !== 'TODOS') q = q.eq('tipo_campanha', filtros.tipo);
  if (filtros.prefixo && filtros.prefixo !== 'TODOS')
    q = q.eq('prefixo_criativo', filtros.prefixo);
  if (filtros.fonte && filtros.fonte !== 'TODOS') q = q.eq('utm_source', filtros.fonte);
  if (filtros.busca) {
    q = q.or(
      `nome.ilike.%${filtros.busca}%,telefone.ilike.%${filtros.busca}%,primeira_mensagem.ilike.%${filtros.busca}%`,
    );
  }
  const limit = filtros.limit ?? 100;
  const offset = filtros.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, count } = await q;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function buscarContratos(
  supabase: SupabaseClient,
  filtros: { from: string; to: string; tipo?: string; status?: string },
) {
  let q = supabase
    .from('contratos')
    .select('*')
    .gte('data_criacao', filtros.from)
    .lte('data_criacao', filtros.to)
    .order('data_criacao', { ascending: false });
  if (filtros.tipo && filtros.tipo !== 'TODOS') q = q.eq('tipo_contrato', filtros.tipo);
  if (filtros.status && filtros.status !== 'TODOS') q = q.eq('status', filtros.status);
  const { data } = await q;
  return data ?? [];
}

export async function buscarCriativosResumo(
  supabase: SupabaseClient,
  filtro: PeriodoFiltro,
) {
  const { data } = await supabase
    .from('leads')
    .select('prefixo_criativo, status, data_criacao')
    .gte('data_criacao', filtro.from)
    .lte('data_criacao', filtro.to);

  const grupos: Record<string, { total: number; atendidos: number; porDia: Map<string, number> }> = {
    PP: { total: 0, atendidos: 0, porDia: new Map() },
    ABE: { total: 0, atendidos: 0, porDia: new Map() },
    SEG: { total: 0, atendidos: 0, porDia: new Map() },
    SEM_PREFIXO: { total: 0, atendidos: 0, porDia: new Map() },
  };
  for (const row of data ?? []) {
    const key = row.prefixo_criativo ?? 'SEM_PREFIXO';
    if (!grupos[key]) continue;
    grupos[key].total += 1;
    if (row.status === 'Concluido') grupos[key].atendidos += 1;
    if (row.data_criacao) {
      const d = row.data_criacao.slice(0, 10);
      grupos[key].porDia.set(d, (grupos[key].porDia.get(d) ?? 0) + 1);
    }
  }

  const dias = new Set<string>();
  for (const g of Object.values(grupos)) for (const d of g.porDia.keys()) dias.add(d);
  const evolucao = Array.from(dias)
    .sort()
    .map((dia) => ({
      dia,
      PP: grupos.PP.porDia.get(dia) ?? 0,
      ABE: grupos.ABE.porDia.get(dia) ?? 0,
      SEG: grupos.SEG.porDia.get(dia) ?? 0,
      SEM_PREFIXO: grupos.SEM_PREFIXO.porDia.get(dia) ?? 0,
    }));

  return {
    cards: Object.entries(grupos).map(([prefixo, g]) => ({
      prefixo,
      total: g.total,
      atendidos: g.atendidos,
      taxaAtendimento: g.total ? g.atendidos / g.total : 0,
      mediaDia: g.porDia.size ? g.total / g.porDia.size : 0,
    })),
    evolucao,
  };
}

// =====================================================================
// Juridico: clientes, casos, honorarios, audiencias, prazos
// =====================================================================

export interface FiltroClientes {
  busca?: string;
  responsavel_id?: number | null;
  limit?: number;
  offset?: number;
}

export async function buscarClientes(supabase: SupabaseClient, f: FiltroClientes = {}) {
  let q = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .order('nome', { ascending: true });
  if (f.busca) {
    q = q.or(
      `nome.ilike.%${f.busca}%,cpf_cnpj.ilike.%${f.busca}%,telefone.ilike.%${f.busca}%,email.ilike.%${f.busca}%`,
    );
  }
  if (f.responsavel_id) q = q.eq('membro_responsavel_id', f.responsavel_id);
  const limit = f.limit ?? 100;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, count } = await q;
  return { rows: (data ?? []) as Cliente[], total: count ?? 0 };
}

export async function buscarClientePorId(supabase: SupabaseClient, id: number) {
  const { data } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
  return (data ?? null) as Cliente | null;
}

export async function buscarCasosDoCliente(supabase: SupabaseClient, clienteId: number) {
  const { data } = await supabase
    .from('casos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Caso[];
}

export interface FiltroCasos {
  busca?: string;
  status?: string;
  fase?: string;
  responsavel_id?: number | null;
  area?: string;
  limit?: number;
  offset?: number;
}

export async function buscarCasos(supabase: SupabaseClient, f: FiltroCasos = {}) {
  let q = supabase
    .from('casos')
    .select('*, clientes(id,nome,telefone,cpf_cnpj)', { count: 'exact' })
    .order('updated_at', { ascending: false });
  if (f.busca) {
    q = q.or(`titulo.ilike.%${f.busca}%,numero_cnj.ilike.%${f.busca}%`);
  }
  if (f.status && f.status !== 'TODOS') q = q.eq('status', f.status);
  if (f.fase && f.fase !== 'TODAS') q = q.eq('fase', f.fase);
  if (f.area) q = q.eq('area', f.area);
  if (f.responsavel_id) q = q.eq('membro_responsavel_id', f.responsavel_id);
  const limit = f.limit ?? 50;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, count } = await q;
  return { rows: (data ?? []) as (Caso & { clientes?: Partial<Cliente> })[], total: count ?? 0 };
}

export async function buscarCasoPorId(supabase: SupabaseClient, id: number) {
  const { data } = await supabase
    .from('casos')
    .select('*, clientes(id,nome,telefone,cpf_cnpj,email)')
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as (Caso & { clientes?: Partial<Cliente> }) | null;
}

export async function buscarHonorariosDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('honorarios')
    .select('*, parcelas(*)')
    .eq('caso_id', casoId)
    .order('id', { ascending: true });
  return (data ?? []) as (Honorario & { parcelas: Parcela[] })[];
}

export async function buscarAudienciasDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('audiencias')
    .select('*')
    .eq('caso_id', casoId)
    .order('data_hora', { ascending: true });
  return (data ?? []) as Audiencia[];
}

export async function buscarPrazosDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('prazos')
    .select('*')
    .eq('caso_id', casoId)
    .order('data_fatal', { ascending: true });
  return (data ?? []) as Prazo[];
}

export async function buscarTotaisJuridico(supabase: SupabaseClient) {
  const [clientesResp, casosAtivosResp, audienciasResp, prazosResp, inadimplentes] =
    await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('casos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase
        .from('audiencias')
        .select('id', { count: 'exact', head: true })
        .gte('data_hora', new Date().toISOString())
        .lte(
          'data_hora',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .eq('status', 'agendada'),
      supabase
        .from('prazos')
        .select('id', { count: 'exact', head: true })
        .is('concluido_em', null)
        .lte(
          'data_fatal',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        ),
      supabase
        .from('honorarios')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'inadimplente'),
    ]);
  return {
    clientes: clientesResp.count ?? 0,
    casosAtivos: casosAtivosResp.count ?? 0,
    audienciasProximas30Dias: audienciasResp.count ?? 0,
    prazosProximos7Dias: prazosResp.count ?? 0,
    honorariosInadimplentes: inadimplentes.count ?? 0,
  };
}

// =====================================================================
// Sprint 2: agenda, notas, documentos, tags
// =====================================================================

export interface FiltroAgenda {
  tipo?: 'audiencia' | 'prazo' | 'reuniao' | 'TODOS';
  responsavel_id?: number;
  from?: string;
  to?: string;
}

export async function buscarAgenda(
  supabase: SupabaseClient,
  filtro: FiltroAgenda = {},
) {
  let q = supabase.from('agenda_completa').select('*').order('quando', { ascending: true });
  if (filtro.tipo && filtro.tipo !== 'TODOS') q = q.eq('tipo', filtro.tipo);
  if (filtro.responsavel_id) q = q.eq('membro_responsavel_id', filtro.responsavel_id);
  if (filtro.from) q = q.gte('quando', filtro.from);
  if (filtro.to) q = q.lte('quando', filtro.to);
  const { data } = await q;
  return (data ?? []) as import('./types').AgendaItem[];
}

export async function buscarNotasDoCliente(supabase: SupabaseClient, clienteId: number) {
  const { data } = await supabase
    .from('notas')
    .select('*, autor:membros(id,nome)')
    .eq('cliente_id', clienteId)
    .order('fixada', { ascending: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as (import('./types').Nota & {
    autor?: { id: number; nome: string } | null;
  })[];
}

export async function buscarNotasDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('notas')
    .select('*, autor:membros(id,nome)')
    .eq('caso_id', casoId)
    .order('fixada', { ascending: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as (import('./types').Nota & {
    autor?: { id: number; nome: string } | null;
  })[];
}

export async function buscarDocumentosDoCliente(
  supabase: SupabaseClient,
  clienteId: number,
) {
  const { data } = await supabase
    .from('documentos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  return (data ?? []) as import('./types').Documento[];
}

export async function buscarDocumentosDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('documentos')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false });
  return (data ?? []) as import('./types').Documento[];
}

export async function buscarTags(
  supabase: SupabaseClient,
  escopo?: import('./types').EscopoTag,
) {
  let q = supabase.from('tags').select('*').order('nome', { ascending: true });
  if (escopo) q = q.in('escopo', [escopo, 'todos']);
  const { data } = await q;
  return (data ?? []) as import('./types').Tag[];
}

export async function buscarTagsDoCliente(supabase: SupabaseClient, clienteId: number) {
  const { data } = await supabase
    .from('cliente_tags')
    .select('tag:tags(*)')
    .eq('cliente_id', clienteId);
  return ((data ?? []) as unknown as { tag: import('./types').Tag }[])
    .map((r) => r.tag)
    .filter(Boolean);
}

export async function buscarTagsDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('caso_tags')
    .select('tag:tags(*)')
    .eq('caso_id', casoId);
  return ((data ?? []) as unknown as { tag: import('./types').Tag }[])
    .map((r) => r.tag)
    .filter(Boolean);
}

// =====================================================================
// Sprint 3: financeiro juridico
// =====================================================================

export interface FiltroParcelas {
  situacao?: 'paga' | 'a_vencer' | 'vence_hoje' | 'vencida' | 'TODAS';
  cliente_id?: number;
  caso_id?: number;
  tipo_honorario?: import('./types').TipoHonorario;
  busca?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function buscarParcelas(
  supabase: SupabaseClient,
  f: FiltroParcelas = {},
) {
  let q = supabase
    .from('parcelas_resumo')
    .select('*', { count: 'exact' })
    .order('vencimento', { ascending: true });
  if (f.situacao && f.situacao !== 'TODAS') q = q.eq('situacao', f.situacao);
  if (f.cliente_id) q = q.eq('cliente_id', f.cliente_id);
  if (f.caso_id) q = q.eq('caso_id', f.caso_id);
  if (f.tipo_honorario) q = q.eq('tipo_honorario', f.tipo_honorario);
  if (f.busca) {
    q = q.or(
      `cliente_nome.ilike.%${f.busca}%,caso_titulo.ilike.%${f.busca}%`,
    );
  }
  if (f.from) q = q.gte('vencimento', f.from);
  if (f.to) q = q.lte('vencimento', f.to);
  const limit = f.limit ?? 100;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, count } = await q;
  return {
    rows: (data ?? []) as import('./types').ParcelaResumo[],
    total: count ?? 0,
  };
}

export async function buscarTotaisFinanceiroJuridico(supabase: SupabaseClient) {
  const { data } = await supabase.from('parcelas_resumo').select('valor, situacao');
  const rows = (data ?? []) as { valor: number; situacao: string }[];
  const acc = { recebido: 0, a_vencer: 0, vence_hoje: 0, vencido: 0 };
  for (const r of rows) {
    const v = Number(r.valor) || 0;
    if (r.situacao === 'paga') acc.recebido += v;
    else if (r.situacao === 'a_vencer') acc.a_vencer += v;
    else if (r.situacao === 'vence_hoje') acc.vence_hoje += v;
    else if (r.situacao === 'vencida') acc.vencido += v;
  }
  return acc;
}

export async function buscarReceitaPorMes(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('receita_prevista_mes')
    .select('*')
    .order('mes', { ascending: true });
  return (data ?? []) as import('./types').ReceitaMes[];
}

export async function buscarInadimplencia(supabase: SupabaseClient, limit = 50) {
  const { data } = await supabase
    .from('inadimplencia_clientes')
    .select('*')
    .order('valor_total_vencido', { ascending: false })
    .range(0, limit - 1);
  return (data ?? []) as import('./types').InadimplenciaCliente[];
}

export async function buscarComissoesDoCaso(supabase: SupabaseClient, casoId: number) {
  const { data } = await supabase
    .from('comissoes')
    .select('*, beneficiario:membros(id,nome)')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false });
  return (data ?? []) as (import('./types').Comissao & {
    beneficiario?: { id: number; nome: string } | null;
  })[];
}

export async function buscarComissoesPendentes(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('comissoes')
    .select('*, beneficiario:membros(id,nome), casos(id,titulo,cliente_id,clientes(nome))')
    .eq('status', 'pendente')
    .order('devida_em', { ascending: true });
  return data ?? [];
}

export async function buscarRecibosDoCliente(
  supabase: SupabaseClient,
  clienteId: number,
) {
  const { data } = await supabase
    .from('recibos')
    .select('*')
    .eq('cliente_id', clienteId)
    .is('cancelado_em', null)
    .order('emitido_em', { ascending: false });
  return (data ?? []) as import('./types').Recibo[];
}
