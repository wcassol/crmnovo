export type TipoCampanha =
  | 'APP_MOBILIDADE'
  | 'SERVIDOR_PUBLICO'
  | 'NAO_CLASSIFICADO'
  | 'GENERICO';

export type StatusLead = 'Pendente' | 'Em andamento' | 'Concluido';

export type StatusContrato = 'Assinado' | 'Em curso' | 'Recusado' | 'Expirado';

export type PrefixoCriativo = 'PP' | 'ABE' | 'SEG' | null;

export interface Lead {
  id: number;
  wts_session_id: string | null;
  nome: string | null;
  telefone: string | null;
  status: StatusLead | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  primeira_mensagem: string | null;
  prefixo_criativo: PrefixoCriativo;
  tipo_campanha: TipoCampanha | null;
  tempo_atendimento_min: number | null;
  data_criacao: string | null;
  data_primeira_mensagem: string | null;
  data_ultima_mensagem: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampanhaMeta {
  id: number;
  campaign_id: string;
  nome: string;
  tipo: TipoCampanha;
  status: string;
  objetivo: string | null;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  gasto: number;
  cpr: number;
  cpm: number;
  ctr: number;
  data_inicio: string | null;
  data_fim: string | null;
  updated_at: string;
}

export interface Reuniao {
  id: number;
  calcom_booking_id: string;
  nome_cliente: string | null;
  email_cliente: string | null;
  telefone_cliente: string | null;
  data_hora: string;
  status: string;
  tipo_campanha: TipoCampanha | null;
  canal: string | null;
  owner: string | null;
  lead_id: number | null;
}

export interface Contrato {
  id: number;
  zapsign_doc_id: string;
  nome_documento: string;
  tipo_contrato: TipoCampanha;
  status: StatusContrato;
  valor_entrada: number;
  data_criacao: string | null;
  data_assinatura: string | null;
  tempo_para_assinar_min: number | null;
  lead_id: number | null;
}

export interface Signatario {
  id: number;
  contrato_id: number;
  nome: string | null;
  email: string | null;
  status: string;
  data_assinatura: string | null;
}

export interface FunilDiario {
  id: number;
  data: string;
  tipo_campanha: TipoCampanha | 'TOTAL';
  impressoes: number;
  alcance: number;
  conversas_meta: number;
  leads_wts: number;
  leads_atendidos: number;
  reunioes_agendadas: number;
  contratos_enviados: number;
  contratos_assinados: number;
  gasto_meta: number;
  cpl: number;
  cac: number;
  receita_entrada: number;
  receita_potencial: number;
}

export interface SyncLog {
  id: number;
  fonte: string;
  status: 'sucesso' | 'erro' | 'em_andamento';
  registros_processados: number;
  erro: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
}

export interface FunilEtapa {
  label: string;
  valor: number;
  cor: string;
  taxaConversao?: number;
}

export interface KPIData {
  investimento: number;
  totalLeads: number;
  contratosAssinados: number;
  contratosEnviados: number;
  cac: number;
  cpl: number;
  roiEntrada: number;
  roiPotencial: number;
  receitaEntrada: number;
  receitaPotencial: number;
}

// =====================================================================
// Juridico
// =====================================================================

export type TipoPessoa = 'PF' | 'PJ';

export type FaseCaso =
  | 'pre_processual'
  | 'inicial'
  | 'contestacao'
  | 'instrucao'
  | 'sentenca'
  | 'recurso'
  | 'transitado'
  | 'execucao'
  | 'arquivado';

export type StatusCaso =
  | 'ativo'
  | 'suspenso'
  | 'arquivado'
  | 'ganho'
  | 'perdido'
  | 'acordo';

export type ResultadoCaso =
  | 'procedente'
  | 'improcedente'
  | 'parcial'
  | 'acordo'
  | 'extinto';

export type TipoHonorario =
  | 'entrada'
  | 'exito'
  | 'recursal'
  | 'sucumbencia'
  | 'fixo'
  | 'consultivo';

export type StatusHonorario =
  | 'pendente'
  | 'parcialmente_pago'
  | 'quitado'
  | 'cancelado'
  | 'inadimplente';

export type StatusAudiencia =
  | 'agendada'
  | 'realizada'
  | 'cancelada'
  | 'adiada'
  | 'redesignada';

export type ModalidadeAudiencia = 'presencial' | 'virtual' | 'hibrida';

export type TipoPrazo = 'fatal' | 'comum' | 'administrativo' | 'interno';

export interface Membro {
  id: number;
  auth_user_id: string | null;
  nome: string;
  email: string | null;
  oab: string | null;
  cargo: string | null;
  especialidade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number;
  tipo_pessoa: TipoPessoa;
  nome: string;
  cpf_cnpj: string | null;
  rg: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  profissao: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pix_chave: string | null;
  pix_tipo: string | null;
  observacoes: string | null;
  lead_id: number | null;
  membro_responsavel_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Caso {
  id: number;
  cliente_id: number;
  contrato_id: number | null;
  titulo: string;
  tipo_acao: string | null;
  area: string | null;
  numero_cnj: string | null;
  vara: string | null;
  comarca: string | null;
  uf: string | null;
  valor_causa: number | null;
  valor_provavel_exito: number | null;
  fase: FaseCaso;
  status: StatusCaso;
  data_distribuicao: string | null;
  data_sentenca: string | null;
  data_transito: string | null;
  resultado: ResultadoCaso | null;
  membro_responsavel_id: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Honorario {
  id: number;
  caso_id: number;
  tipo: TipoHonorario;
  descricao: string | null;
  valor_total: number;
  percentual: number | null;
  base_calculo: number | null;
  status: StatusHonorario;
  created_at: string;
  updated_at: string;
}

export interface Parcela {
  id: number;
  honorario_id: number;
  numero: number;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Audiencia {
  id: number;
  caso_id: number;
  data_hora: string;
  tipo: string | null;
  modalidade: ModalidadeAudiencia;
  local_endereco: string | null;
  link_video: string | null;
  membro_responsavel_id: number | null;
  status: StatusAudiencia;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prazo {
  id: number;
  caso_id: number;
  descricao: string;
  tipo: TipoPrazo;
  data_fatal: string;
  membro_responsavel_id: number | null;
  concluido_em: string | null;
  concluido_por: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export const FASE_CASO_LABELS: Record<FaseCaso, string> = {
  pre_processual: 'Pre-processual',
  inicial: 'Inicial',
  contestacao: 'Contestacao',
  instrucao: 'Instrucao',
  sentenca: 'Sentenca',
  recurso: 'Recurso',
  transitado: 'Transitado em julgado',
  execucao: 'Execucao',
  arquivado: 'Arquivado',
};

export const STATUS_CASO_LABELS: Record<StatusCaso, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  arquivado: 'Arquivado',
  ganho: 'Ganho',
  perdido: 'Perdido',
  acordo: 'Acordo',
};

export const TIPO_HONORARIO_LABELS: Record<TipoHonorario, string> = {
  entrada: 'Entrada',
  exito: 'Exito',
  recursal: 'Recursal',
  sucumbencia: 'Sucumbencia',
  fixo: 'Fixo',
  consultivo: 'Consultivo',
};

export const STATUS_HONORARIO_LABELS: Record<StatusHonorario, string> = {
  pendente: 'Pendente',
  parcialmente_pago: 'Parcialmente pago',
  quitado: 'Quitado',
  cancelado: 'Cancelado',
  inadimplente: 'Inadimplente',
};

// =====================================================================
// Operacional (Sprint 2)
// =====================================================================

export type EscopoTag = 'cliente' | 'caso' | 'lead' | 'todos';

export interface Tag {
  id: number;
  nome: string;
  cor: string;
  escopo: EscopoTag;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Nota {
  id: number;
  cliente_id: number | null;
  caso_id: number | null;
  autor_id: number | null;
  conteudo: string;
  fixada: boolean;
  created_at: string;
  updated_at: string;
}

export interface Documento {
  id: number;
  cliente_id: number | null;
  caso_id: number | null;
  nome: string;
  categoria: string | null;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  descricao: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

export type TipoAgenda = 'audiencia' | 'prazo' | 'reuniao';

export interface AgendaItem {
  tipo: TipoAgenda;
  id: number;
  caso_id: number | null;
  caso_titulo: string | null;
  contato_nome: string | null;
  quando: string;
  subtipo: string | null;
  status: string;
  membro_responsavel_id: number | null;
  local: string | null;
  link: string | null;
}

// =====================================================================
// Financeiro (Sprint 3)
// =====================================================================

export type SituacaoParcela = 'paga' | 'a_vencer' | 'vence_hoje' | 'vencida';

export interface ParcelaResumo {
  id: number;
  honorario_id: number;
  numero: number;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  observacao: string | null;
  tipo_honorario: TipoHonorario;
  status_honorario: StatusHonorario;
  caso_id: number;
  caso_titulo: string;
  cliente_id: number;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  situacao: SituacaoParcela;
  dias_atraso: number;
}

export interface ReceitaMes {
  mes_ref: string;
  mes: string;
  qtd_parcelas: number;
  valor_total: number;
  valor_pago: number | null;
  valor_vencido: number | null;
  valor_a_vencer: number | null;
}

export interface InadimplenciaCliente {
  cliente_id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  qtd_parcelas_vencidas: number;
  valor_total_vencido: number;
  parcela_mais_antiga: string;
  max_dias_atraso: number;
}

export type TipoComissao = 'captacao' | 'parceria' | 'indicacao' | 'outro';
export type BaseCalculoComissao =
  | 'honorario_entrada'
  | 'honorario_exito'
  | 'valor_causa'
  | 'fixo';
export type StatusComissao = 'pendente' | 'paga' | 'cancelada';

export interface Comissao {
  id: number;
  caso_id: number;
  honorario_id: number | null;
  beneficiario_membro_id: number | null;
  beneficiario_externo_nome: string | null;
  beneficiario_externo_doc: string | null;
  tipo: TipoComissao;
  base_calculo: BaseCalculoComissao;
  percentual: number | null;
  valor: number;
  status: StatusComissao;
  devida_em: string | null;
  paga_em: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recibo {
  id: number;
  numero: string;
  cliente_id: number;
  caso_id: number | null;
  valor: number;
  emitido_em: string;
  forma_pagamento: string | null;
  descricao: string | null;
  storage_path: string | null;
  parcelas_ids: number[];
  emitido_por: number | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
}

export const SITUACAO_PARCELA_LABELS: Record<SituacaoParcela, string> = {
  paga: 'Paga',
  a_vencer: 'A vencer',
  vence_hoje: 'Vence hoje',
  vencida: 'Vencida',
};

export const STATUS_COMISSAO_LABELS: Record<StatusComissao, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

// =====================================================================
// BI (Sprint 4)
// =====================================================================

export interface BiTaxaExito {
  tipo_acao: string;
  total_casos: number;
  encerrados: number;
  ganhos: number;
  perdidos: number;
  em_andamento: number;
  taxa_exito: number | null;
  valor_medio_exito: number | null;
  valor_total_exito: number | null;
}

export interface BiTempoTramitacao {
  tipo_acao: string;
  qtd_casos: number;
  dias_medio: number | null;
  dias_minimo: number | null;
  dias_maximo: number | null;
  dias_mediana: number | null;
}

export interface BiProdutividade {
  membro_id: number;
  nome: string;
  oab: string | null;
  cargo: string | null;
  casos_total: number;
  casos_ativos: number;
  casos_ganhos: number;
  casos_perdidos: number;
  taxa_exito: number | null;
  valor_recuperado: number;
  audiencias_proximas_30d: number;
  prazos_proximos_7d: number;
}

export interface BiLtvCliente {
  cliente_id: number;
  nome: string;
  telefone: string | null;
  qtd_casos: number;
  casos_ganhos: number;
  honorarios_contratados: number;
  honorarios_pagos: number;
  cliente_desde: string;
  dias_relacionamento: number;
}

export interface BiForecast {
  tipo_acao: string;
  qtd_casos_ativos: number;
  valor_provavel_total: number;
  taxa_exito_historica: number;
  forecast_ponderado: number;
}

export interface BiFunilJuridico {
  total_leads: number;
  total_clientes: number;
  total_casos: number;
  casos_ativos: number;
  casos_ganhos: number;
  casos_perdidos: number;
  taxa_lead_cliente: number;
  casos_por_cliente: number;
  taxa_exito_geral: number;
}
