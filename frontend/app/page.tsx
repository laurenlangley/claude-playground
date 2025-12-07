export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-light tracking-tight mb-2">
          HealthOps
        </h1>
        <p className="text-gray-500">
          Personal Health Analytics Platform
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <h2 className="text-2xl font-light mb-4">
            Welcome to HealthOps
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your personal health analytics platform is being built.
            Phase 1: Data Ingestion in progress...
          </p>
        </div>
      </main>
    </div>
  );
}
