'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  RefreshCw,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { ErrorAnalytics, ErrorLogEntry } from '@/lib/errors/logger';
import { ErrorSeverity, ErrorCategory } from '@/lib/errors/types';
import { ErrorList } from './error-display';

interface ErrorAnalyticsProps {
  analytics: ErrorAnalytics;
  logs: ErrorLogEntry[];
  onRefresh?: () => void;
  onExport?: () => void;
  onClearLogs?: () => void;
}

const SEVERITY_COLORS = {
  [ErrorSeverity.LOW]: '#3b82f6',
  [ErrorSeverity.MEDIUM]: '#f59e0b',
  [ErrorSeverity.HIGH]: '#ef4444',
  [ErrorSeverity.CRITICAL]: '#dc2626',
};

const CATEGORY_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
];

export function ErrorAnalyticsDashboard({ 
  analytics, 
  logs, 
  onRefresh, 
  onExport, 
  onClearLogs 
}: ErrorAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [filteredLogs, setFilteredLogs] = useState<ErrorLogEntry[]>(logs);

  useEffect(() => {
    // Filter logs based on time range
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const rangeMs = timeRanges[selectedTimeRange as keyof typeof timeRanges] || timeRanges['24h'];
    const cutoff = new Date(now.getTime() - rangeMs);
    
    setFilteredLogs(logs.filter(log => log.timestamp >= cutoff));
  }, [logs, selectedTimeRange]);

  // Prepare chart data
  const severityData = Object.entries(analytics.errorsBySeverity).map(([severity, count]) => ({
    severity,
    count,
    color: SEVERITY_COLORS[severity as ErrorSeverity],
  }));

  const categoryData = Object.entries(analytics.errorsByCategory)
    .filter(([, count]) => count > 0)
    .map(([category, count], index) => ({
      category: category.replace('_', ' '),
      count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  // Error trend data (last 24 hours)
  const trendData = React.useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
      return hour;
    });

    return hours.map(hour => {
      const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
      const errorsInHour = filteredLogs.filter(log => 
        log.timestamp >= hour && log.timestamp < nextHour
      );

      return {
        time: hour.toLocaleTimeString([], { hour: '2-digit' }),
        errors: errorsInHour.length,
        critical: errorsInHour.filter(log => log.error.severity === ErrorSeverity.CRITICAL).length,
        high: errorsInHour.filter(log => log.error.severity === ErrorSeverity.HIGH).length,
      };
    });
  }, [filteredLogs]);

  const getHealthStatus = () => {
    if (analytics.errorRate > 10) return { status: 'critical', color: 'text-red-600', icon: TrendingDown };
    if (analytics.errorRate > 5) return { status: 'warning', color: 'text-yellow-600', icon: Activity };
    return { status: 'healthy', color: 'text-green-600', icon: TrendingUp };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Error Analytics</h2>
          <p className="text-muted-foreground">
            Monitor application errors and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <HealthIcon className={`h-4 w-4 ${healthStatus.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{healthStatus.status}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.errorRate} errors/min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.recoveryRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Recoverable errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Last {selectedTimeRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Time Range:</span>
        {['1h', '24h', '7d', '30d'].map((range) => (
          <Button
            key={range}
            size="sm"
            variant={selectedTimeRange === range ? 'default' : 'outline'}
            onClick={() => setSelectedTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="recent">Recent Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Errors by Severity */}
            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
                <CardDescription>Distribution of error severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ severity, count }) => `${severity}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Error Trend (24h)</CardTitle>
                <CardDescription>Errors over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="errors" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Trends by Severity</CardTitle>
              <CardDescription>Hourly breakdown of errors by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="critical" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    name="Critical"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="high" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="High"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Category</CardTitle>
              <CardDescription>Distribution of errors across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>
                    Latest {filteredLogs.length} errors from the last {selectedTimeRange}
                  </CardDescription>
                </div>
                {onClearLogs && filteredLogs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={onClearLogs}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No errors in the selected time range</p>
                  <p className="text-sm">System is running smoothly!</p>
                </div>
              ) : (
                <ErrorList 
                  errors={filteredLogs.map(log => log.error)} 
                  maxVisible={10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Critical Errors Alert */}
      {analytics.errorsBySeverity[ErrorSeverity.CRITICAL] > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Alert:</strong> {analytics.errorsBySeverity[ErrorSeverity.CRITICAL]} critical error(s) detected. 
            Immediate attention required.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}