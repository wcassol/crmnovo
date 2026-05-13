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

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = String(value).replace(/\D+/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return '-';
  const d = String(value).replace(/\D+/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return value;
}

export function dateRangeMes(): { from: string; to: string } {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  return {
    from: format(inicio, "yyyy-MM-dd'T'00:00:00"),
    to: format(agora, "yyyy-MM-dd'T'HH:mm:ss"),
  };
}
