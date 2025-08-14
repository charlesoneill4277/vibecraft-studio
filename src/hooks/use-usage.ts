import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usageService } from '@/lib/usage/usage-service';
import type { 
  UsageQuotaDetailed, 
  UsageSummary, 
  UsageAlert, 
  UserSubscription,
  CostBreakdown,
  UsageAnalytics
} from '@/types';

// Quota hooks
export function useUserQuotas() {
  return useQuery({
    queryKey: ['usage', 'quotas'],
    queryFn: async () => {
      const response = await fetch('/api/usage/quotas');
      if (!response.ok) throw new Error('Failed to fetch quotas');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUsageSummary() {
  return useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: async () => {
      const response = await fetch('/api/usage/quotas');
      if (!response.ok) throw new Error('Failed to fetch usage summary');
      const data = await response.json();
      return data.summary as UsageSummary[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpdateQuotas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planType: 'free' | 'pro' | 'enterprise') => {
      const response = await fetch('/api/usage/quotas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });
      if (!response.ok) throw new Error('Failed to update quotas');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// Analytics hooks
export function useUsageAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['usage', 'analytics', days],
    queryFn: async () => {
      const response = await fetch(`/api/usage/analytics?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch usage analytics');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCostBreakdown(startDate?: Date, endDate?: Date) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  return useQuery({
    queryKey: ['usage', 'cost-breakdown', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/usage/analytics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch cost breakdown');
      const data = await response.json();
      return data.costBreakdown as CostBreakdown[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Alert hooks
export function useUsageAlerts(unreadOnly: boolean = false) {
  return useQuery({
    queryKey: ['usage', 'alerts', unreadOnly],
    queryFn: async () => {
      const response = await fetch(`/api/usage/alerts?unreadOnly=${unreadOnly}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      return data.alerts as UsageAlert[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/usage/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      });
      if (!response.ok) throw new Error('Failed to mark alert as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage', 'alerts'] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/usage/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
      if (!response.ok) throw new Error('Failed to dismiss alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage', 'alerts'] });
    },
  });
}

// Subscription hooks
export function useUserSubscription() {
  return useQuery({
    queryKey: ['usage', 'subscription'],
    queryFn: async () => {
      const response = await fetch('/api/usage/subscription');
      if (!response.ok) throw new Error('Failed to fetch subscription');
      const data = await response.json();
      return data.subscription as UserSubscription | null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionData: Partial<UserSubscription>) => {
      const response = await fetch('/api/usage/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData),
      });
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// Utility hooks
export function useQuotaCheck(provider: string, quotaType: 'tokens' | 'requests' | 'cost') {
  const { data: summary } = useUsageSummary();
  
  const quota = summary?.find(q => q.provider === provider && q.quotaType === quotaType);
  
  return {
    quota,
    isNearLimit: quota?.isNearLimit || false,
    isOverLimit: quota?.isOverLimit || false,
    usagePercentage: quota?.usagePercentage || 0,
    remaining: quota ? quota.monthlyLimit - quota.currentUsage : 0,
    resetDate: quota?.resetDate,
  };
}

export function useUnreadAlertsCount() {
  const { data: alerts } = useUsageAlerts(true);
  return alerts?.length || 0;
}

// Real-time usage tracking
export function useUsageTracker() {
  const queryClient = useQueryClient();

  const trackUsage = async (params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    projectId?: string;
    requestDuration?: number;
    status?: 'success' | 'error' | 'rate_limited' | 'quota_exceeded';
    errorMessage?: string;
  }) => {
    try {
      // Log usage through the service
      await usageService.logAIUsage({
        userId: '', // Will be set by the service from auth
        ...params,
      });

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  };

  return { trackUsage };
}