'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getDateRangePreset } from '@/lib/utils';
import HRVTrendChart from '@/components/HRVTrendChart';
import CyclePhaseChart from '@/components/CyclePhaseChart';
import MetricCard from '@/components/MetricCard';

export default function Dashboard() {
  const [hrvData, setHrvData] = useState<any>(null);
  const [cycleAnalysis, setCycleAnalysis] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { start, end } = getDateRangePreset(timeRange);

        // Fetch HRV trends
        const hrvTrends = await api.getTrends('hrv_sdnn', start, end, 7);
        setHrvData(hrvTrends);

        // Fetch cycle analysis
        const cycleData = await api.getCycleAnalysis('hrv_sdnn', start, end);
        setCycleAnalysis(cycleData);

        // Fetch summary
        const summaryData = await api.getSummary(30);
        setSummary(summaryData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7DF9FF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white">
                Command Center
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your health analytics dashboard
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-[#7DF9FF] text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Current HRV"
            value={hrvData?.moving_average?.data[hrvData.moving_average.data.length - 1]?.moving_average?.toFixed(1) || 'N/A'}
            unit="ms"
            trend={hrvData?.trend_analysis?.trend}
            subtitle="7-day average"
            color="blue"
          />
          <MetricCard
            title="Trend"
            value={hrvData?.trend_analysis?.trend || 'N/A'}
            subtitle={hrvData?.trend_analysis?.interpretation}
            color="green"
          />
          <MetricCard
            title="Data Points"
            value={hrvData?.moving_average?.data?.length || 0}
            subtitle={`Over ${timeRange}`}
            color="neutral"
          />
        </div>

        {/* HRV Trend Chart */}
        {hrvData?.moving_average?.data && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              HRV Trend Over Time
            </h2>
            <HRVTrendChart
              data={hrvData.moving_average.data}
              showMovingAverage={true}
            />
          </div>
        )}

        {/* Cycle Phase Analysis */}
        {cycleAnalysis?.cycle_analysis && Object.keys(cycleAnalysis.cycle_analysis).length > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              HRV by Cycle Phase
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              How your HRV varies across your menstrual cycle
            </p>
            <CyclePhaseChart
              data={cycleAnalysis.cycle_analysis}
              metricUnit="ms"
            />

            {/* Insights */}
            {cycleAnalysis.insights && cycleAnalysis.insights.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Key Insights:
                </h3>
                {cycleAnalysis.insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-[#39FF14] mt-1">•</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{insight}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Anomalies Alert */}
        {hrvData?.anomalies?.data && hrvData.anomalies.data.length > 0 && (
          <div className="bg-[#FF1493]/10 border border-[#FF1493]/20 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              ⚠️ Anomalies Detected
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Found {hrvData.anomalies.count} unusual readings in this period
            </p>
            <div className="space-y-2">
              {hrvData.anomalies.data.slice(0, 3).map((anomaly: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{new Date(anomaly.timestamp).toLocaleDateString()}:</span>{' '}
                  <span className={anomaly.direction === 'high' ? 'text-green-600' : 'text-red-600'}>
                    {anomaly.value.toFixed(1)} ms ({anomaly.direction})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
