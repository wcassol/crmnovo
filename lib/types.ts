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
