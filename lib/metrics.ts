import { BUSINESS_CONSTANTS } from './constants';
import { safeDiv } from './utils';

export interface FunilTotais {
  impressoes: number;
  alcance: number;
  conversasMeta: number;
  leadsWts: number;
  leadsAtendidos: number;
  reunioesAgendadas: number;
  contratosEnviados: number;
  contratosAssinados: number;
  gastoMeta: number;
}

export function calcularKPIs(t: FunilTotais) {
  const receitaEntrada = t.contratosAssinados * BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA;
  const receitaPotencial = t.contratosAssinados * BUSINESS_CONSTANTS.VALOR_POTENCIAL_CASO;
  return {
    investimento: t.gastoMeta,
    totalLeads: t.leadsWts,
    contratosAssinados: t.contratosAssinados,
    contratosEnviados: t.contratosEnviados,
    cac: safeDiv(t.gastoMeta, t.contratosAssinados),
    cpl: safeDiv(t.gastoMeta, t.leadsWts),
    roiEntrada: safeDiv(receitaEntrada, t.gastoMeta) * 100,
    roiPotencial: safeDiv(receitaPotencial, t.gastoMeta) * 100,
    receitaEntrada,
    receitaPotencial,
  };
}

export function calcularEtapasFunil(t: FunilTotais) {
  const etapas = [
    { label: 'Impressoes', valor: t.impressoes, cor: '#1D5FA5' },
    { label: 'Conversas Meta', valor: t.conversasMeta, cor: '#1D9E75' },
    { label: 'Leads WTS', valor: t.leadsWts, cor: '#7F77DD' },
    { label: 'Atendidos', valor: t.leadsAtendidos, cor: '#EF9F27' },
    { label: 'Reunioes', valor: t.reunioesAgendadas, cor: '#D4537E' },
    { label: 'Contratos enviados', valor: t.contratosEnviados, cor: '#1D5FA5' },
    { label: 'Assinados', valor: t.contratosAssinados, cor: '#1D9E75' },
  ];
  return etapas.map((etapa, idx) => {
    const anterior = idx === 0 ? null : etapas[idx - 1].valor;
    const taxa = anterior && anterior > 0 ? etapa.valor / anterior : null;
    return { ...etapa, taxaConversao: taxa };
  });
}

export function calcularTaxas(t: FunilTotais) {
  return {
    atendimento: safeDiv(t.leadsAtendidos, t.leadsWts),
    agendamento: safeDiv(t.reunioesAgendadas, t.leadsAtendidos),
    envioContrato: safeDiv(t.contratosEnviados, t.reunioesAgendadas),
    assinatura: safeDiv(t.contratosAssinados, t.contratosEnviados),
    leadParaContrato: safeDiv(t.contratosAssinados, t.leadsWts),
  };
}

export function calcularReceitaPorTaxa(
  contratosAssinados: number,
  taxaProcedencia: number,
) {
  const casosProcedentes = contratosAssinados * taxaProcedencia;
  return (
    contratosAssinados * BUSINESS_CONSTANTS.VALOR_CONTRATO_ENTRADA +
    casosProcedentes * BUSINESS_CONSTANTS.VALOR_POTENCIAL_CASO
  );
}
