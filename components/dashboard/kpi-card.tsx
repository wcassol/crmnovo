import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  valor: string;
  hint?: string;
  trend?: {
    valor: number;
    label?: string;
  };
  icon?: LucideIcon;
  cor?: 'dark' | 'green' | 'orange' | 'red' | 'purple' | 'pink' | 'medium';
  className?: string;
}

const corMap: Record<NonNullable<Props['cor']>, string> = {
  dark: 'text-brand-dark',
  green: 'text-brand-green',
  orange: 'text-brand-orange',
  red: 'text-brand-red',
  purple: 'text-brand-purple',
  pink: 'text-brand-pink',
  medium: 'text-brand-medium',
};

export function KPICard({ label, valor, hint, icon: Icon, cor = 'dark', className }: Props) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={cn('mt-2 text-2xl font-bold sm:text-3xl', corMap[cor])}>
              {valor}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg bg-brand-surface p-2', corMap[cor])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
