import { getTrendIndicator } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  subtitle?: string;
  color?: 'green' | 'blue' | 'pink' | 'neutral';
}

export default function MetricCard({
  title,
  value,
  unit,
  trend,
  subtitle,
  color = 'neutral'
}: MetricCardProps) {
  const colorClasses = {
    green: 'border-l-4 border-l-[#39FF14]',
    blue: 'border-l-4 border-l-[#7DF9FF]',
    pink: 'border-l-4 border-l-[#FF1493]',
    neutral: 'border-l-4 border-l-gray-300',
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-light text-gray-900 dark:text-white">
              {value}
            </p>
            {unit && (
              <span className="text-lg text-gray-500 dark:text-gray-400">{unit}</span>
            )}
            {trend && (
              <span className="text-2xl ml-2">{getTrendIndicator(trend)}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
