'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useUsageSummary, useUserSubscription } from '@/hooks/use-usage';
import { formatNumber, formatCurrency, getUsageColor, getUsageBadgeVariant } from '@/lib/utils';
import type { UsageSummary } from '@/types';

interface QuotaProgressProps {
  provider?: string;
  compact?: boolean;
  showUpgradePrompt?: boolean;
}

export function QuotaProgress({ provider, compact = false, showUpgradePrompt = true }: QuotaProgressProps) {
  const { data: summary, isLoading, refetch } = useUsageSummary();
  const { data: subscription } = useUserSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!summary?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Quotas</CardTitle>
          <CardDescription>No quota data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Start using AI features to see your quota usage</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredSummary = provider 
    ? summary.filter(q => q.provider === provider)
    : summary;

  const groupedByProvider = filteredSummary.reduce((acc, quota) => {
    if (!acc[quota.provider]) {
      acc[quota.provider] = [];
    }
    acc[quota.provider].push(quota);
    return acc;
  }, {} as Record<string, UsageSummary[]>);

  const hasWarnings = summary.some(q => q.isNearLimit || q.isOverLimit);
  const isFreePlan = subscription?.planType === 'free';

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Usage Quotas</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your AI usage across providers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasWarnings && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Attention needed
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {Object.entries(groupedByProvider).map(([providerName, quotas]) => (
          <QuotaProviderCard
            key={providerName}
            provider={providerName}
            quotas={quotas}
            compact={compact}
            showUpgradePrompt={showUpgradePrompt && isFreePlan}
          />
        ))}
      </div>
    </div>
  );
}

interface QuotaProviderCardProps {
  provider: string;
  quotas: UsageSummary[];
  compact: boolean;
  showUpgradePrompt: boolean;
}

function QuotaProviderCard({ provider, quotas, compact, showUpgradePrompt }: QuotaProviderCardProps) {
  const hasIssues = quotas.some(q => q.isNearLimit || q.isOverLimit);
  const overLimitCount = quotas.filter(q => q.isOverLimit).length;
  const nearLimitCount = quotas.filter(q => q.isNearLimit && !q.isOverLimit).length;

  return (
    <Card className={hasIssues ? 'border-yellow-200 bg-yellow-50/50' : ''}>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <div className="flex items-center justify-between">
          <CardTitle className="capitalize text-base">{provider}</CardTitle>
          <div className="flex items-center gap-1">
            {overLimitCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overLimitCount} over
              </Badge>
            )}
            {nearLimitCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {nearLimitCount} near
              </Badge>
            )}
            {!hasIssues && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
        {!compact && (
          <CardDescription>
            Current usage and limits for {provider}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {quotas.map((quota) => (
          <QuotaItem key={`${quota.provider}-${quota.quotaType}`} quota={quota} compact={compact} />
        ))}
        
        {showUpgradePrompt && hasIssues && (
          <div className="pt-2 border-t">
            <Button size="sm" className="w-full gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade for Higher Limits
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuotaItemProps {
  quota: UsageSummary;
  compact: boolean;
}

function QuotaItem({ quota, compact }: QuotaItemProps) {
  const getQuotaIcon = () => {
    switch (quota.quotaType) {
      case 'tokens':
        return <Zap className="h-4 w-4" />;
      case 'requests':
        return <TrendingUp className="h-4 w-4" />;
      case 'cost':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const formatQuotaValue = (value: number, type: string) => {
    switch (type) {
      case 'cost':
        return formatCurrency(value / 100); // Convert from cents
      case 'tokens':
      case 'requests':
        return formatNumber(value);
      default:
        return value.toString();
    }
  };

  const getProgressColor = () => {
    if (quota.isOverLimit) return 'bg-red-500';
    if (quota.isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getQuotaIcon()}
          <span className="text-sm font-medium capitalize">{quota.quotaType}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant={getUsageBadgeVariant(quota.usagePercentage)}>
                {Math.round(quota.usagePercentage)}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {formatQuotaValue(quota.currentUsage, quota.quotaType)} of{' '}
                {formatQuotaValue(quota.monthlyLimit, quota.quotaType)} used
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-1">
        <Progress 
          value={Math.min(quota.usagePercentage, 100)} 
          className="h-2"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatQuotaValue(quota.currentUsage, quota.quotaType)} /{' '}
            {formatQuotaValue(quota.monthlyLimit, quota.quotaType)}
          </span>
          {!compact && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Resets {new Date(quota.resetDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {quota.isOverLimit && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Quota exceeded</span>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar or header
export function QuotaProgressCompact({ provider }: { provider?: string }) {
  return <QuotaProgress provider={provider} compact={true} showUpgradePrompt={false} />;
}