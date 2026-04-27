import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { TIMEZONE } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0%';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ',';
  try {
    return formatInTimeZone(parseISO(iso), TIMEZONE, "dd/MM/yyyy 'as' HH:mm", {
      locale: ptBR,
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ',';
  try {
    return formatInTimeZone(parseISO(iso), TIMEZONE, 'dd/MM/yyyy', {
      locale: ptBR,
    });
  } catch {
    return iso;
  }
}

export function formatTempoMin(min: number | null | undefined): string {
  if (min === null || min === undefined || Number.isNaN(min)) return ',';
  if (min < 60) return `${Math.round(min)} min`;
  const horas = Math.floor(min / 60);
  const restante = Math.round(min % 60);
  if (horas < 24) return `${horas}h ${restante}min`;
  const dias = Math.floor(horas / 24);
  const horasRest = horas % 24;
  return `${dias}d ${horasRest}h`;
}

export function safeDiv(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

export function dateRangeMes(): { from: string; to: string } {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  return {
    from: format(inicio, "yyyy-MM-dd'T'00:00:00"),
    to: format(agora, "yyyy-MM-dd'T'HH:mm:ss"),
  };
}
