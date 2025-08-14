'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell
} from 'recharts';
import { DollarSign, Zap, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

interface ProjectUsageStats extends UsageStats {
  timeline: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

interface QuotaInfo {
  withinLimit: boolean;
  usage: number;
  limit: number;
  costUsage: number;
  costLimit: number;
}

interface UsageDashboardProps {
  projectId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function UsageDashboard({ projectId }: UsageDashboardProps) {
  const [usageStats, setUsageStats] = useState<UsageStats | ProjectUsageStats | null>(null);
  const [quotas, setQuotas] = useState<Record<string, QuotaInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchUsageData();
    if (!projectId) {
      fetchQuotaData();
    }
  }, [projectId, timeRange]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (projectId) {
        params.append('projectId', projectId);
      }

      const response = await fetch(`/api/ai/usage?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsageStats(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaData = async () => {
    try {
      const providers = ['openai', 'anthropic', 'straico', 'cohere'];
      const quotaPromises = providers.map(async (provider) => {
        const response = await fetch(`/api/ai/usage/quota?provider=${provider}`);
        if (response.ok) {
          const data = await response.json();
          return { provider, quota: data.quota };
        }
        return null;
      });

      const results = await Promise.all(quotaPromises);
      const quotaData: Record<string, QuotaInfo> = {};
      
      results.forEach((result) => {
        if (result) {
          quotaData[result.provider] = result.quota;
        }
      });

      setQuotas(quotaData);
    } catch (err) {
      console.error('Error fetching quota data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!usageStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Usage Data</CardTitle>
          <CardDescription>
            No AI usage data found for the selected time period.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const providerData = Object.entries(usageStats.byProvider).map(([provider, stats]) => ({
    name: provider,
    requests: stats.requests,
    tokens: stats.tokens,
    cost: stats.cost,
  }));

  const hasQuotaWarnings = Object.values(quotas).some(quota => !quota.withinLimit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {projectId ? 'Project Usage' : 'AI Usage Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            Monitor your AI usage, costs, and quotas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90 days
          </Button>
        </div>
      </div>

      {hasQuotaWarnings && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have exceeded usage quotas for some AI providers. Consider upgrading your limits.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${usageStats.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">By Provider</TabsTrigger>
          {!projectId && <TabsTrigger value="quotas">Quotas</TabsTrigger>}
          {'timeline' in usageStats && <TabsTrigger value="timeline">Timeline</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                    >
                      {providerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']} />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {providerData.map((provider) => (
              <Card key={provider.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{provider.name}</span>
                    <Badge variant="secondary">
                      {provider.requests} requests
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Tokens</div>
                      <div className="text-2xl font-bold">{provider.tokens.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-medium">Cost</div>
                      <div className="text-2xl font-bold">${provider.cost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Avg Cost/Request</div>
                      <div className="text-2xl font-bold">
                        ${(provider.cost / provider.requests).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {!projectId && (
          <TabsContent value="quotas" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(quotas).map(([provider, quota]) => (
                <Card key={provider}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{provider}</span>
                      <Badge variant={quota.withinLimit ? 'default' : 'destructive'}>
                        {quota.withinLimit ? 'Within Limits' : 'Over Limit'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Token Usage</span>
                        <span>{quota.usage.toLocaleString()} / {quota.limit.toLocaleString()}</span>
                      </div>
                      <Progress value={(quota.usage / quota.limit) * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cost Usage</span>
                        <span>${quota.costUsage.toFixed(2)} / ${quota.costLimit.toFixed(2)}</span>
                      </div>
                      <Progress value={(quota.costUsage / quota.costLimit) * 100} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {'timeline' in usageStats && (
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={usageStats.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}