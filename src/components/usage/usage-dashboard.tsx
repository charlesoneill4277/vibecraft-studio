'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Line
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock,
  RefreshCw,
  ArrowUp
} from 'lucide-react';
import { 
  useUsageAnalytics, 
  useUsageSummary, 
  useCostBreakdown,
  useUsageAlerts,
  useUserSubscription,
  useMarkAlertAsRead,
  useDismissAlert
} from '@/hooks/use-usage';
import { formatCurrency, formatNumber } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function UsageDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const { data: analytics, isLoading: analyticsLoading } = useUsageAnalytics(selectedPeriod);
  const { data: summary, isLoading: summaryLoading } = useUsageSummary();
  const { data: costBreakdown } = useCostBreakdown();
  const { data: alerts } = useUsageAlerts();
  const { data: subscription } = useUserSubscription();
  const markAsRead = useMarkAlertAsRead();
  const dismissAlert = useDismissAlert();

  if (analyticsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalStats = analytics?.totalStats;
  const unreadAlerts = alerts?.filter(alert => !alert.isRead) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your AI usage, costs, and quotas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscription?.planType === 'free' ? 'secondary' : 'default'}>
            {subscription?.planType?.toUpperCase() || 'FREE'} Plan
          </Badge>
          {subscription?.planType === 'free' && (
            <Button size="sm" className="gap-2">
              <ArrowUp className="h-4 w-4" />
              Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {unreadAlerts.length > 0 && (
        <div className="space-y-2">
          {unreadAlerts.map((alert) => (
            <Alert key={alert.id} variant={alert.alertType === 'quota_exceeded' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {alert.alertType === 'quota_exceeded' && 'Quota Exceeded'}
                {alert.alertType === 'quota_warning' && 'Quota Warning'}
                {alert.alertType === 'cost_warning' && 'Cost Warning'}
                {alert.alertType === 'upgrade_prompt' && 'Upgrade Recommended'}
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead.mutate(alert.id)}
                  >
                    Mark Read
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissAlert.mutate(alert.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats?.totalRequests || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalStats?.thisMonth.requests || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats?.totalTokens || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalStats?.thisMonth.tokens || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalStats?.thisMonth.cost || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.analytics?.[0]?.avgRequestDuration 
                ? `${Math.round(analytics.analytics[0].avgRequestDuration)}ms`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quotas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="quotas" className="space-y-4">
          <QuotasTab summary={summary} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab 
            analytics={analytics} 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <CostsTab costBreakdown={costBreakdown} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuotasTab({ summary }: { summary: any[] }) {
  if (!summary?.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No quota data available</p>
        </CardContent>
      </Card>
    );
  }

  const groupedByProvider = summary.reduce((acc, quota) => {
    if (!acc[quota.provider]) {
      acc[quota.provider] = [];
    }
    acc[quota.provider].push(quota);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(groupedByProvider).map(([provider, quotas]) => (
        <Card key={provider}>
          <CardHeader>
            <CardTitle className="capitalize">{provider}</CardTitle>
            <CardDescription>Current usage and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotas.map((quota) => (
              <div key={`${quota.provider}-${quota.quotaType}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{quota.quotaType}</span>
                  <Badge variant={quota.isOverLimit ? 'destructive' : quota.isNearLimit ? 'secondary' : 'default'}>
                    {Math.round(quota.usagePercentage)}%
                  </Badge>
                </div>
                <Progress value={quota.usagePercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatNumber(quota.currentUsage)} / {formatNumber(quota.monthlyLimit)}</span>
                  <span>Resets {new Date(quota.resetDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsTab({ 
  analytics, 
  selectedPeriod, 
  onPeriodChange 
}: { 
  analytics: any; 
  selectedPeriod: number;
  onPeriodChange: (period: number) => void;
}) {
  const chartData = analytics?.analytics?.map((item: any) => ({
    date: new Date(item.usageDate).toLocaleDateString(),
    requests: item.totalRequests,
    tokens: item.totalTokens,
    cost: item.totalCost
  })) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Usage Trends</h3>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant={selectedPeriod === days ? 'default' : 'outline'}
              onClick={() => onPeriodChange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tokens" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function CostsTab({ costBreakdown }: { costBreakdown: any[] }) {
  if (!costBreakdown?.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No cost data available</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = costBreakdown.map((item, index) => ({
    name: `${item.provider} ${item.model}`,
    value: item.totalCost,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cost Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costBreakdown.map((item, index) => (
              <div key={`${item.provider}-${item.model}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{item.provider} {item.model}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(item.requestCount)} requests • {formatNumber(item.totalTokens)} tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(item.totalCost)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.avgCostPerRequest)}/req
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}