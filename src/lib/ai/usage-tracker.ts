import { AIUsage, UsageQuota } from '@/types';
import { calculateCost, AIProviderType } from './providers';

export class AIUsageTracker {
  private usageData: AIUsage[] = [];
  private quotas: Map<string, UsageQuota> = new Map();

  /**
   * Track AI usage for a request
   */
  async trackUsage(
    userId: string,
    projectId: string | undefined,
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number,
    requestDuration: number
  ): Promise<AIUsage> {
    const cost = calculateCost(provider, model, inputTokens, outputTokens);
    
    const usage: AIUsage = {
      id: crypto.randomUUID(),
      userId,
      projectId,
      provider,
      model,
      inputTokens,
      outputTokens,
      cost,
      requestDuration,
      createdAt: new Date(),
    };

    // Store usage (in a real implementation, this would go to the database)
    this.usageData.push(usage);

    // Update quota usage
    await this.updateQuotaUsage(userId, provider, cost, inputTokens + outputTokens);

    return usage;
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byProvider: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    const userUsage = this.usageData.filter(usage => {
      if (usage.userId !== userId) return false;
      if (startDate && usage.createdAt < startDate) return false;
      if (endDate && usage.createdAt > endDate) return false;
      return true;
    });

    const stats = {
      totalRequests: userUsage.length,
      totalTokens: userUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      totalCost: userUsage.reduce((sum, u) => sum + u.cost, 0),
      byProvider: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    };

    // Group by provider
    userUsage.forEach(usage => {
      if (!stats.byProvider[usage.provider]) {
        stats.byProvider[usage.provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      
      stats.byProvider[usage.provider].requests++;
      stats.byProvider[usage.provider].tokens += usage.inputTokens + usage.outputTokens;
      stats.byProvider[usage.provider].cost += usage.cost;
    });

    return stats;
  }

  /**
   * Get project usage statistics
   */
  async getProjectUsage(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    timeline: Array<{
      date: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    const projectUsage = this.usageData.filter(usage => {
      if (usage.projectId !== projectId) return false;
      if (startDate && usage.createdAt < startDate) return false;
      if (endDate && usage.createdAt > endDate) return false;
      return true;
    });

    const stats = {
      totalRequests: projectUsage.length,
      totalTokens: projectUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      totalCost: projectUsage.reduce((sum, u) => sum + u.cost, 0),
      timeline: [] as Array<{
        date: string;
        requests: number;
        tokens: number;
        cost: number;
      }>,
    };

    // Group by date for timeline
    const dailyStats = new Map<string, { requests: number; tokens: number; cost: number }>();
    
    projectUsage.forEach(usage => {
      const date = usage.createdAt.toISOString().split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { requests: 0, tokens: 0, cost: 0 });
      }
      
      const dayStats = dailyStats.get(date)!;
      dayStats.requests++;
      dayStats.tokens += usage.inputTokens + usage.outputTokens;
      dayStats.cost += usage.cost;
    });

    stats.timeline = Array.from(dailyStats.entries()).map(([date, data]) => ({
      date,
      ...data,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  /**
   * Check if user has exceeded quota
   */
  async checkQuota(userId: string, provider: AIProviderType): Promise<{
    withinLimit: boolean;
    usage: number;
    limit: number;
    costUsage: number;
    costLimit: number;
  }> {
    const quotaKey = `${userId}:${provider}`;
    const quota = this.quotas.get(quotaKey);

    if (!quota) {
      // No quota set, assume unlimited for now
      return {
        withinLimit: true,
        usage: 0,
        limit: Infinity,
        costUsage: 0,
        costLimit: Infinity,
      };
    }

    return {
      withinLimit: quota.currentUsage < quota.monthlyLimit && quota.currentCost < quota.costLimit,
      usage: quota.currentUsage,
      limit: quota.monthlyLimit,
      costUsage: quota.currentCost,
      costLimit: quota.costLimit,
    };
  }

  /**
   * Set usage quota for a user and provider
   */
  async setQuota(
    userId: string,
    provider: AIProviderType,
    monthlyLimit: number,
    costLimit: number
  ): Promise<void> {
    const quotaKey = `${userId}:${provider}`;
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month

    this.quotas.set(quotaKey, {
      id: crypto.randomUUID(),
      userId,
      provider,
      monthlyLimit,
      currentUsage: 0,
      costLimit,
      currentCost: 0,
      resetDate,
    });
  }

  /**
   * Update quota usage
   */
  private async updateQuotaUsage(
    userId: string,
    provider: AIProviderType,
    cost: number,
    tokens: number
  ): Promise<void> {
    const quotaKey = `${userId}:${provider}`;
    const quota = this.quotas.get(quotaKey);

    if (quota) {
      // Check if quota needs to be reset (new month)
      const now = new Date();
      if (now >= quota.resetDate) {
        quota.currentUsage = 0;
        quota.currentCost = 0;
        quota.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      quota.currentUsage += tokens;
      quota.currentCost += cost;
    }
  }

  /**
   * Get cost estimate for a request
   */
  estimateCost(
    provider: AIProviderType,
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): number {
    return calculateCost(provider, model, estimatedInputTokens, estimatedOutputTokens);
  }
}

// Export singleton instance
export const aiUsageTracker = new AIUsageTracker();