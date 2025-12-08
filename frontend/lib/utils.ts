import { format, parseISO, subDays, subMonths } from 'date-fns';

/**
 * Format date for display
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Get date range presets
 */
export function getDateRangePreset(preset: 'week' | 'month' | 'quarter' | 'year' | 'all') {
  const end = new Date();
  let start: Date;

  switch (preset) {
    case 'week':
      start = subDays(end, 7);
      break;
    case 'month':
      start = subDays(end, 30);
      break;
    case 'quarter':
      start = subMonths(end, 3);
      break;
    case 'year':
      start = subMonths(end, 12);
      break;
    default:
      start = new Date('2017-01-01'); // All time
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Format metric value with unit
 */
export function formatMetricValue(value: number, unit: string): string {
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Get trend indicator emoji/icon
 */
export function getTrendIndicator(trend: 'increasing' | 'decreasing' | 'stable'): string {
  switch (trend) {
    case 'increasing':
      return '↗';
    case 'decreasing':
      return '↘';
    default:
      return '→';
  }
}

/**
 * Get cycle phase color (high contrast, vibrant)
 */
export function getCyclePhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    menstrual: '#FF0080', // Vibrant hot pink
    follicular: '#00FF00', // Pure neon green
    ovulatory: '#00D9FF', // Bright cyan
    luteal: '#FF69B4', // Saturated pink
  };
  return colors[phase.toLowerCase()] || '#999999';
}

/**
 * Calculate percent change
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get health status color
 */
export function getHealthStatusColor(percentile: number): string {
  if (percentile >= 75) return '#39FF14'; // Excellent
  if (percentile >= 50) return '#7DF9FF'; // Good
  if (percentile >= 25) return '#FFB6C1'; // Fair
  return '#FF1493'; // Needs attention
}
