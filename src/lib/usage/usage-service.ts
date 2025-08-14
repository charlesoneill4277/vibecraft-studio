import { createClient } from '@/lib/supabase/client';
import type { 
  UsageQuotaDetailed, 
  AIUsageLog, 
  UsageAlert, 
  UserSubscription,
  UsageSummary,
  CostBreakdown,
  UsageAnalytics
} from '@/types';

export class UsageService {
  private supabase = createClient();

  // Quota Management
  async getUserQuotas(userId: string): Promise<UsageQuotaDetailed[]> {
    const { data, error } = await this.supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('provider', { ascending: true });

    if (error) throw error;
    
    return data.map(quota => ({
      ...quota,
      resetDate: new Date(quota.reset_date),
      createdAt: new Date(quota.created_at),
      updatedAt: new Date(quota.updated_at)
    }));
  }

  async checkQuotaAvailability(
    userId: string, 
    provider: string, 
    quotaType: 'tokens' | 'requests' | 'cost',
    requestedAmount: number
  ): Promise<{ allowed: boolean; remaining: number; resetDate: Date }> {
    const { data, error } = await this.supabase
      .rpc('check_usage_quota', {
        p_user_id: userId,
        p_provider: provider,
        p_quota_type: quotaType,
        p_usage_amount: requestedAmount
      });

    if (error) throw error;

    // Get current quota info
    const quota = await this.getQuota(userId, provider, quotaType);
    
    return {
      allowed: data,
      remaining: quota ? quota.monthlyLimit - quota.currentUsage : 0,
      resetDate: quota?.resetDate || new Date()
    };
  }

  async getQuota(userId: string, provider: string, quotaType: string): Promise<UsageQuotaDetailed | null> {
    const { data, error } = await this.supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('quota_type', quotaType)
      .eq('is_active', true)
      .single();

    if (error) return null;
    
    return {
      ...data,
      resetDate: new Date(data.reset_date),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async updateQuotaLimits(userId: string, planType: 'free' | 'pro' | 'enterprise'): Promise<void> {
    const { error } = await this.supabase
      .rpc('initialize_user_quotas', {
        user_id: userId,
        plan_type: planType
      });

    if (error) throw error;
  }

  // Usage Logging
  async logAIUsage(params: {
    userId: string;
    projectId?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    requestDuration?: number;
    status?: 'success' | 'error' | 'rate_limited' | 'quota_exceeded';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('log_ai_usage', {
        p_user_id: params.userId,
        p_project_id: params.projectId || null,
        p_provider: params.provider,
        p_model: params.model,
        p_input_tokens: params.inputTokens,
        p_output_tokens: params.outputTokens,
        p_estimated_cost: params.estimatedCost,
        p_request_duration: params.requestDuration || null,
        p_status: params.status || 'success',
        p_error_message: params.errorMessage || null,
        p_metadata: params.metadata || {}
      });

    if (error) throw error;
    return data;
  }

  async getUserUsageLogs(
    userId: string, 
    options: {
      projectId?: string;
      provider?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AIUsageLog[]> {
    let query = this.supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options.provider) {
      query = query.eq('provider', options.provider);
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(log => ({
      ...log,
      createdAt: new Date(log.created_at)
    }));
  }

  // Usage Analytics
  async getUsageSummary(userId: string): Promise<UsageSummary[]> {
    const quotas = await this.getUserQuotas(userId);
    
    return quotas.map(quota => {
      const usagePercentage = quota.monthlyLimit > 0 
        ? (quota.currentUsage / quota.monthlyLimit) * 100 
        : 0;

      return {
        provider: quota.provider,
        quotaType: quota.quotaType,
        currentUsage: quota.currentUsage,
        monthlyLimit: quota.monthlyLimit,
        usagePercentage,
        resetDate: quota.resetDate,
        isNearLimit: usagePercentage >= 80,
        isOverLimit: usagePercentage >= 100
      };
    });
  }

  async getCostBreakdown(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<CostBreakdown[]> {
    const { data, error } = await this.supabase
      .from('ai_usage_logs')
      .select('provider, model, estimated_cost, total_tokens')
      .eq('user_id', userId)
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by provider and model
    const breakdown = data.reduce((acc, log) => {
      const key = `${log.provider}-${log.model}`;
      
      if (!acc[key]) {
        acc[key] = {
          provider: log.provider,
          model: log.model,
          totalCost: 0,
          totalTokens: 0,
          requestCount: 0,
          avgCostPerRequest: 0,
          avgCostPerToken: 0
        };
      }

      acc[key].totalCost += log.estimated_cost;
      acc[key].totalTokens += log.total_tokens;
      acc[key].requestCount += 1;

      return acc;
    }, {} as Record<string, CostBreakdown>);

    // Calculate averages
    return Object.values(breakdown).map(item => ({
      ...item,
      avgCostPerRequest: item.requestCount > 0 ? item.totalCost / item.requestCount : 0,
      avgCostPerToken: item.totalTokens > 0 ? item.totalCost / item.totalTokens : 0
    }));
  }

  async getUsageAnalytics(
    userId: string, 
    days: number = 30
  ): Promise<UsageAnalytics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('usage_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('usage_date', startDate.toISOString())
      .order('usage_date', { ascending: false });

    if (error) throw error;

    return data.map(analytics => ({
      ...analytics,
      usageDate: new Date(analytics.usage_date)
    }));
  }

  // Alert Management
  async getUserAlerts(userId: string, unreadOnly: boolean = false): Promise<UsageAlert[]> {
    let query = this.supabase
      .from('usage_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(alert => ({
      ...alert,
      createdAt: new Date(alert.created_at)
    }));
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('usage_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) throw error;
  }

  async dismissAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('usage_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId);

    if (error) throw error;
  }

  async createUsageAlert(params: {
    userId: string;
    alertType: 'quota_warning' | 'quota_exceeded' | 'cost_warning' | 'upgrade_prompt';
    provider?: string;
    thresholdPercentage?: number;
    currentUsage?: number;
    limitValue?: number;
    message: string;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('create_usage_alert', {
        p_user_id: params.userId,
        p_alert_type: params.alertType,
        p_provider: params.provider || null,
        p_threshold_percentage: params.thresholdPercentage || null,
        p_current_usage: params.currentUsage || null,
        p_limit_value: params.limitValue || null,
        p_message: params.message
      });

    if (error) throw error;
    return data;
  }

  // Rate Limiting
  async checkRateLimit(
    userId: string, 
    endpoint: string, 
    maxRequests: number = 100
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_max_requests: maxRequests
      });

    if (error) throw error;
    return data;
  }

  // Subscription Management
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;

    return {
      ...data,
      currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async updateSubscription(userId: string, updates: Partial<UserSubscription>): Promise<void> {
    const { error } = await this.supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Update quotas based on new plan
    if (updates.planType) {
      await this.updateQuotaLimits(userId, updates.planType);
    }
  }

  // Utility Methods
  async getTotalUsageStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    thisMonth: {
      requests: number;
      tokens: number;
      cost: number;
    };
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all-time stats
    const { data: allTimeData, error: allTimeError } = await this.supabase
      .from('ai_usage_logs')
      .select('total_tokens, estimated_cost')
      .eq('user_id', userId)
      .eq('status', 'success');

    if (allTimeError) throw allTimeError;

    // Get this month's stats
    const { data: monthData, error: monthError } = await this.supabase
      .from('ai_usage_logs')
      .select('total_tokens, estimated_cost')
      .eq('user_id', userId)
      .eq('status', 'success')
      .gte('created_at', startOfMonth.toISOString());

    if (monthError) throw monthError;

    const totalRequests = allTimeData.length;
    const totalTokens = allTimeData.reduce((sum, log) => sum + log.total_tokens, 0);
    const totalCost = allTimeData.reduce((sum, log) => sum + log.estimated_cost, 0);

    const monthRequests = monthData.length;
    const monthTokens = monthData.reduce((sum, log) => sum + log.total_tokens, 0);
    const monthCost = monthData.reduce((sum, log) => sum + log.estimated_cost, 0);

    return {
      totalRequests,
      totalTokens,
      totalCost,
      thisMonth: {
        requests: monthRequests,
        tokens: monthTokens,
        cost: monthCost
      }
    };
  }
}

export const usageService = new UsageService();