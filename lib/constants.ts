export const BUSINESS_CONSTANTS = {
  VALOR_CONTRATO_ENTRADA: 399.0,
  VALOR_POTENCIAL_CASO: 3000.0,
  TAXAS_PROCEDENCIA: [0.4, 0.6, 0.8, 1.0] as const,
  META_TEMPO_RESPOSTA_MIN: 5,
  META_TAXA_AGENDAMENTO: 0.5,
  META_TAXA_ASSINATURA: 0.85,
} as const;

export const TIMEZONE = 'America/Sao_Paulo';

export const TIPO_CAMPANHA_LABELS: Record<string, string> = {
  APP_MOBILIDADE: 'APP Mobilidade',
  SERVIDOR_PUBLICO: 'Servidor Publico',
  NAO_CLASSIFICADO: 'Nao classificado',
  GENERICO: 'Generico',
  TOTAL: 'Total',
};

export const TIPO_CAMPANHA_CORES: Record<string, string> = {
  APP_MOBILIDADE: '#1D9E75',
  SERVIDOR_PUBLICO: '#1D5FA5',
  NAO_CLASSIFICADO: '#9CA3AF',
  GENERICO: '#7F77DD',
  TOTAL: '#002060',
};

export const STATUS_LEAD_LABELS: Record<string, string> = {
  Pendente: 'Pendente',
  'Em andamento': 'Em andamento',
  Concluido: 'Concluido',
};

export const STATUS_CONTRATO_LABELS: Record<string, string> = {
  Assinado: 'Assinado',
  'Em curso': 'Em curso',
  Recusado: 'Recusado',
  Expirado: 'Expirado',
};

export const COLORS = {
  brandDark: '#002060',
  brandMedium: '#1D5FA5',
  brandGreen: '#1D9E75',
  brandOrange: '#EF9F27',
  brandRed: '#E24B4A',
  brandPurple: '#7F77DD',
  brandPink: '#D4537E',
  brandSurface: '#F2F2F2',
} as const;
