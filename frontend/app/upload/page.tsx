'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type FileType = 'csv' | 'txt' | 'pdf';

interface UploadResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFileUpload = async (file: File, type: FileType) => {
    setUploading(true);

    try {
      const response = await api.uploadFile(file, type);
      setResults(prev => [...prev, {
        success: true,
        message: `✅ ${file.name} uploaded successfully!`,
        details: response
      }]);
    } catch (error: any) {
      setResults(prev => [...prev, {
        success: false,
        message: `❌ Failed to upload ${file.name}`,
        error: error.message
      }]);
    } finally {
      setUploading(false);
    }
  };

  const detectFileType = (filename: string): FileType | null => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'txt') return 'txt';
    if (ext === 'pdf') return 'pdf';
    return null;
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
      const type = detectFileType(file.name);
      if (type) {
        await handleFileUpload(file, type);
      } else {
        setResults(prev => [...prev, {
          success: false,
          message: `❌ Unsupported file type: ${file.name}`,
          error: 'Only CSV, TXT, and PDF files are supported'
        }]);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      await handleFileUpload(file, type);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white">
            Upload Health Data
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Import CSVs, PDFs, or text files to analyze your health metrics
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Drag & Drop Area */}
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center mb-8 hover:border-[#00D9FF] transition-colors bg-white dark:bg-gray-900"
        >
          <div className="text-6xl mb-4">📤</div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Drag & Drop Files Here
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Or click below to select files
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            {/* CSV Upload */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, 'csv')}
                className="hidden"
                multiple
              />
              <div className="bg-[#00D9FF] hover:bg-[#00BFDF] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                📊 Upload CSV
              </div>
            </label>

            {/* TXT Upload */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".txt"
                onChange={(e) => handleFileSelect(e, 'txt')}
                className="hidden"
                multiple
              />
              <div className="bg-[#00FF00] hover:bg-[#00DD00] text-gray-900 px-6 py-3 rounded-lg font-medium transition-colors">
                📝 Upload TXT
              </div>
            </label>

            {/* PDF Upload */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e, 'pdf')}
                className="hidden"
                multiple
              />
              <div className="bg-[#FF0080] hover:bg-[#DD006D] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                📄 Upload PDF
              </div>
            </label>
          </div>
        </div>

        {/* Upload Instructions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">CSV Files</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Apple Health exports, wearable data (HRV, sleep, activity)
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">TXT Files</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Menstrual cycle tracking, manual logs (markdown table format)
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">PDF Files</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Lab reports (Quest Diagnostics, LabCorp) - AI-powered extraction
            </p>
          </div>
        </div>

        {/* Upload Results */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Upload Results
            </h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  }`}
                >
                  <p className={`font-medium ${
                    result.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {result.details.metrics_added && (
                        <p>📊 Metrics added: {result.details.metrics_added}</p>
                      )}
                      {result.details.csv_type && (
                        <p>📂 Type: {result.details.csv_type}</p>
                      )}
                      {result.details.date_range && (
                        <p>📅 Date range: {new Date(result.details.date_range.start).toLocaleDateString()} - {new Date(result.details.date_range.end).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                  {result.error && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setResults([])}
              className="mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear results
            </button>
          </div>
        )}

        {/* Loading State */}
        {uploading && (
          <div className="fixed bottom-8 right-8 bg-white dark:bg-gray-900 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00D9FF]"></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Uploading...
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
