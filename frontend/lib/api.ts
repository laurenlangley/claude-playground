/**
 * API client for HealthOps backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface MetricData {
  timestamp: string;
  value: number | string;
  metadata?: Record<string, any>;
}

export interface MetricResponse {
  metric_name: string;
  display_name: string;
  unit: string;
  count: number;
  data: MetricData[];
}

export interface TrendAnalysis {
  slope: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  r_squared: number;
  interpretation: string;
}

export interface CycleAnalysis {
  cycle_analysis: {
    [phase: string]: {
      mean: number;
      count: number;
      percent_diff_from_avg: number;
    };
  };
  insights: string[];
}

export const api = {
  /**
   * Get metric data
   */
  async getMetric(
    metricName: string,
    startDate?: string,
    endDate?: string,
    limit: number = 1000
  ): Promise<MetricResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('limit', limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/metrics/${metricName}?${params}`
    );
    if (!response.ok) throw new Error(`Failed to fetch ${metricName}`);
    return response.json();
  },

  /**
   * Get trend analysis for a metric
   */
  async getTrends(
    metricName: string,
    startDate?: string,
    endDate?: string,
    movingAvgWindow: number = 7
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('moving_avg_window', movingAvgWindow.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/trends/${metricName}?${params}`
    );
    if (!response.ok) throw new Error(`Failed to fetch trends for ${metricName}`);
    return response.json();
  },

  /**
   * Get cycle phase analysis
   */
  async getCycleAnalysis(
    metricName: string,
    startDate?: string,
    endDate?: string
  ): Promise<CycleAnalysis> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/cycle-analysis/${metricName}?${params}`
    );
    if (!response.ok) throw new Error(`Failed to fetch cycle analysis`);
    return response.json();
  },

  /**
   * Get correlation between two metrics
   */
  async getCorrelation(
    metricX: string,
    metricY: string,
    method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
  ) {
    const params = new URLSearchParams({
      metric_x: metricX,
      metric_y: metricY,
      method,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/correlation?${params}`
    );
    if (!response.ok) throw new Error('Failed to fetch correlation');
    return response.json();
  },

  /**
   * Get analytics summary
   */
  async getSummary(days: number = 30) {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/summary?days=${days}`
    );
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  /**
   * Upload file
   */
  async uploadFile(file: File, type: 'csv' | 'txt' | 'pdf') {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload/${type}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};
