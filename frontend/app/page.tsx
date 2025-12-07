import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-extralight tracking-tight text-gray-900 dark:text-white mb-4">
            HealthOps
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-light">
            Personal Health Analytics Platform
          </p>
        </header>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Dashboard Card */}
          <Link href="/dashboard" className="group">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 border-transparent hover:border-[#7DF9FF] transition-all duration-300 p-8 h-full">
              <div className="flex flex-col h-full">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-3">
                  Command Center
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1">
                  View your health metrics, trends, and cycle-aware insights
                </p>
                <div className="text-[#7DF9FF] group-hover:translate-x-2 transition-transform">
                  View Dashboard →
                </div>
              </div>
            </div>
          </Link>

          {/* Upload Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
            <div className="text-4xl mb-4">📁</div>
            <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-3">
              Upload Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Import health data from CSVs, PDFs, or manual logs
            </p>
            <div className="text-gray-400">
              Coming soon...
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl mb-3">💓</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">HRV Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              8 years of heart rate variability data with trend analysis
            </p>
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl mb-3">🌙</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Cycle-Aware</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dynamic phase calculation with performance insights
            </p>
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl mb-3">🧬</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Lab Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered extraction from medical lab reports
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 text-center">
          <div className="inline-grid grid-cols-3 gap-12">
            <div>
              <div className="text-3xl font-light text-[#39FF14] mb-1">9,774</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Health Metrics</div>
            </div>
            <div>
              <div className="text-3xl font-light text-[#7DF9FF] mb-1">2,832</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">HRV Readings</div>
            </div>
            <div>
              <div className="text-3xl font-light text-[#FF1493] mb-1">9</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Years of Data</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
