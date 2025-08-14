'use client';

import React from 'react';
import { ErrorAnalyticsDashboard } from '@/components/errors/error-analytics';
import { useErrorMonitoring } from '@/hooks/use-error-handler';
import { PageErrorBoundary } from '@/components/errors/error-boundary';

export default function ErrorMonitoringPage() {
  const { analytics, recentErrors, refreshAnalytics, clearLogs } = useErrorMonitoring();

  const handleExport = async () => {
    try {
      const response = await fetch('/api/errors/logs?limit=1000');
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data.logs, null, 2)], {
          type: 'application/json',
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export error logs:', error);
    }
  };

  return (
    <PageErrorBoundary>
      <div className="container mx-auto py-8">
        <ErrorAnalyticsDashboard
          analytics={analytics}
          logs={recentErrors.map(error => ({
            id: error.id,
            error,
            timestamp: error.context.timestamp,
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            reported: false,
          }))}
          onRefresh={refreshAnalytics}
          onExport={handleExport}
          onClearLogs={clearLogs}
        />
      </div>
    </PageErrorBoundary>
  );
}