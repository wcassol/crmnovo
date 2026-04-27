'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TIPO_CAMPANHA_CORES, TIPO_CAMPANHA_LABELS } from '@/lib/constants';

interface Linha {
  key: string;
  cor?: string;
  label?: string;
}

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  linhas: Linha[];
  height?: number;
}

export function LinhasChart({ data, xKey, linhas, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey={xKey} fontSize={11} stroke="#6B7280" />
        <YAxis fontSize={11} stroke="#6B7280" />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {linhas.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label ?? TIPO_CAMPANHA_LABELS[l.key] ?? l.key}
            stroke={l.cor ?? TIPO_CAMPANHA_CORES[l.key] ?? '#1D5FA5'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
