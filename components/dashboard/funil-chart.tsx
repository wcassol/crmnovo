'use client';

import { formatNumber, formatPercent } from '@/lib/utils';

interface Etapa {
  label: string;
  valor: number;
  cor: string;
  taxaConversao?: number | null;
}

export function FunilChart({ etapas }: { etapas: Etapa[] }) {
  const max = Math.max(...etapas.map((e) => e.valor), 1);

  return (
    <div className="space-y-2">
      {etapas.map((etapa, idx) => {
        const pct = (etapa.valor / max) * 100;
        return (
          <div key={etapa.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-brand-dark">{etapa.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-brand-dark">
                  {formatNumber(etapa.valor)}
                </span>
                {etapa.taxaConversao !== undefined &&
                  etapa.taxaConversao !== null && (
                    <span className="text-xs text-muted-foreground">
                      {formatPercent(etapa.taxaConversao)}
                    </span>
                  )}
              </div>
            </div>
            <div
              className="h-8 rounded-md bg-brand-surface relative overflow-hidden"
              role="meter"
              aria-valuenow={etapa.valor}
              aria-valuemax={max}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: etapa.cor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
