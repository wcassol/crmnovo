'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Series {
  key: string;
  label: string;
  cor: string;
  yAxisId?: 'left' | 'right';
}

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Series[];
  height?: number;
  dualAxis?: boolean;
}

export function BarrasChart({ data, xKey, series, height = 280, dualAxis }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey={xKey}
          fontSize={11}
          stroke="#6B7280"
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis yAxisId="left" fontSize={11} stroke="#6B7280" />
        {dualAxis && (
          <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#6B7280" />
        )}
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.cor}
            yAxisId={s.yAxisId ?? 'left'}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
