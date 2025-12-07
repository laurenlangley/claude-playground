'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCyclePhaseColor } from '@/lib/utils';

interface CyclePhaseData {
  [phase: string]: {
    mean: number;
    count: number;
    percent_diff_from_avg: number;
  };
}

interface CyclePhaseChartProps {
  data: CyclePhaseData;
  metricUnit: string;
}

export default function CyclePhaseChart({ data, metricUnit }: CyclePhaseChartProps) {
  // Filter out 'overall' and prepare data
  const chartData = Object.entries(data)
    .filter(([phase]) => phase !== 'overall')
    .map(([phase, stats]) => ({
      phase: phase.charAt(0).toUpperCase() + phase.slice(1),
      value: stats.mean,
      count: stats.count,
      percentDiff: stats.percent_diff_from_avg,
    }))
    .sort((a, b) => {
      const order = ['Menstrual', 'Follicular', 'Ovulatory', 'Luteal'];
      return order.indexOf(a.phase) - order.indexOf(b.phase);
    });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis
            dataKey="phase"
            stroke="#6C757D"
            style={{ fontSize: '13px', fontWeight: 500 }}
          />
          <YAxis
            stroke="#6C757D"
            style={{ fontSize: '12px' }}
            label={{ value: metricUnit, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value: number, name: string, props: any) => {
              const diff = props.payload.percentDiff;
              return [
                `${value.toFixed(1)} ${metricUnit} (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`,
                `n=${props.payload.count}`
              ];
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCyclePhaseColor(entry.phase)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
