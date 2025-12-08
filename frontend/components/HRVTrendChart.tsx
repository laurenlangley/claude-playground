'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/lib/utils';

interface DataPoint {
  timestamp: string;
  value: number;
  moving_average?: number;
}

interface HRVTrendChartProps {
  data: DataPoint[];
  showMovingAverage?: boolean;
}

export default function HRVTrendChart({ data, showMovingAverage = true }: HRVTrendChartProps) {
  const chartData = data.map(d => ({
    date: formatDate(d.timestamp, 'MMM d'),
    hrv: d.value,
    ma: d.moving_average,
  }));

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis
            dataKey="date"
            stroke="#6C757D"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6C757D"
            style={{ fontSize: '12px' }}
            label={{ value: 'HRV (ms)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="hrv"
            stroke="#00D9FF"
            strokeWidth={3}
            dot={{ fill: '#00D9FF', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
            name="HRV"
            activeDot={{ r: 6 }}
          />
          {showMovingAverage && (
            <Line
              type="monotone"
              dataKey="ma"
              stroke="#00FF00"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="7-day Average"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
