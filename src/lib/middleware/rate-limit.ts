import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { usageService } from '@/lib/usage/usage-service';

export interface RateLimitConfig {
  maxRequests: number;
  windowDuration: string; // e.g., '1 hour', '1 minute'
  skipSuccessfulAuth?: boolean;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/chat': { maxRequests: 100, windowDuration: '1 hour' },
  '/api/ai/providers': { maxRequests: 50, windowDuration: '1 hour' },
  '/api/projects': { maxRequests: 200, windowDuration: '1 hour' },
  '/api/usage': { maxRequests: 100, windowDuration: '1 hour' },
  '/api/auth': { maxRequests: 20, windowDuration: '15 minutes' },
  default: { maxRequests: 1000, windowDuration: '1 hour' }
};

export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const pathname = new URL(request.url).pathname;
    const rateLimitConfig = config || DEFAULT_RATE_LIMITS[pathname] || DEFAULT_RATE_LIMITS.default;

    // Check rate limit
    const isAllowed = await usageService.checkRateLimit(
      user.id,
      pathname,
      rateLimitConfig.maxRequests
    );

    if (!isAllowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${rateLimitConfig.maxRequests} per ${rateLimitConfig.windowDuration}`,
          retryAfter: 3600 // 1 hour in seconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + 3600000).toString()
          }
        }
      );
    }

    // Proceed with the request
    return await handler(request);

  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request to proceed
    return await handler(request);
  }
}

export function createRateLimitedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest) => {
    return withRateLimit(request, handler, config);
  };
}

// Middleware for quota checking
export async function withQuotaCheck(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  quotaConfig: {
    provider: string;
    quotaType: 'tokens' | 'requests' | 'cost';
    estimatedUsage: number;
  }
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check quota availability
    const quotaCheck = await usageService.checkQuotaAvailability(
      user.id,
      quotaConfig.provider,
      quotaConfig.quotaType,
      quotaConfig.estimatedUsage
    );

    if (!quotaCheck.allowed) {
      // Create quota exceeded alert
      await usageService.createUsageAlert({
        userId: user.id,
        alertType: 'quota_exceeded',
        provider: quotaConfig.provider,
        message: `You have exceeded your ${quotaConfig.quotaType} quota for ${quotaConfig.provider}. Quota resets on ${quotaCheck.resetDate.toLocaleDateString()}.`
      });

      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: `You have exceeded your ${quotaConfig.quotaType} quota for ${quotaConfig.provider}`,
          quotaType: quotaConfig.quotaType,
          provider: quotaConfig.provider,
          resetDate: quotaCheck.resetDate.toISOString(),
          remaining: quotaCheck.remaining
        },
        { status: 429 }
      );
    }

    // Check if approaching quota limit (80%)
    const usageSummary = await usageService.getUsageSummary(user.id);
    const relevantQuota = usageSummary.find(
      q => q.provider === quotaConfig.provider && q.quotaType === quotaConfig.quotaType
    );

    if (relevantQuota && relevantQuota.usagePercentage >= 80 && relevantQuota.usagePercentage < 100) {
      // Create warning alert
      await usageService.createUsageAlert({
        userId: user.id,
        alertType: 'quota_warning',
        provider: quotaConfig.provider,
        thresholdPercentage: Math.round(relevantQuota.usagePercentage),
        currentUsage: relevantQuota.currentUsage,
        limitValue: relevantQuota.monthlyLimit,
        message: `You have used ${Math.round(relevantQuota.usagePercentage)}% of your ${quotaConfig.quotaType} quota for ${quotaConfig.provider}.`
      });
    }

    return await handler(request);

  } catch (error) {
    console.error('Quota checking error:', error);
    // If quota checking fails, allow the request to proceed
    return await handler(request);
  }
}

// Helper function to extract usage from AI requests
export function estimateAIUsage(requestBody: any): {
  provider: string;
  estimatedTokens: number;
  estimatedCost: number;
} {
  const provider = requestBody.provider || 'openai';
  const model = requestBody.model || 'gpt-3.5-turbo';
  const messages = requestBody.messages || [];
  
  // Rough token estimation (4 characters = 1 token)
  const textContent = messages.map((m: any) => m.content).join(' ');
  const estimatedTokens = Math.ceil(textContent.length / 4);
  
  // Rough cost estimation based on provider and model
  const costPerToken = getCostPerToken(provider, model);
  const estimatedCost = estimatedTokens * costPerToken;

  return {
    provider,
    estimatedTokens,
    estimatedCost
  };
}

function getCostPerToken(provider: string, model: string): number {
  // Simplified cost estimation - in production, use actual pricing
  const costs: Record<string, Record<string, number>> = {
    openai: {
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
      'gpt-3.5-turbo': 0.000002,
      default: 0.000002
    },
    anthropic: {
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
      'claude-3-haiku': 0.00000025,
      default: 0.000003
    },
    straico: {
      default: 0.000001
    },
    cohere: {
      default: 0.000001
    }
  };

  return costs[provider]?.[model] || costs[provider]?.default || 0.000001;
}