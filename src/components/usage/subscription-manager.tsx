'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  Crown, 
  Zap, 
  TrendingUp, 
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { 
  useUserSubscription, 
  useUpdateSubscription,
  useUsageSummary 
} from '@/hooks/use-usage';
import { formatCurrency } from '@/lib/utils';

const PLAN_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    billing: null,
    features: [
      '10K tokens per month per provider',
      '100 requests per month per provider',
      '$5 cost limit per month per provider',
      'Basic usage analytics',
      'Email support'
    ],
    limits: {
      tokens: 10000,
      requests: 100,
      cost: 500 // in cents
    }
  },
  pro: {
    name: 'Pro',
    price: 29,
    billing: 'monthly',
    features: [
      '1M tokens per month per provider',
      '10K requests per month per provider',
      '$100 cost limit per month per provider',
      'Advanced usage analytics',
      'Priority support',
      'Usage alerts and notifications',
      'Cost optimization recommendations'
    ],
    limits: {
      tokens: 1000000,
      requests: 10000,
      cost: 10000 // in cents
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    billing: 'monthly',
    features: [
      '10M tokens per month per provider',
      '100K requests per month per provider',
      '$1000 cost limit per month per provider',
      'Full usage analytics and reporting',
      '24/7 dedicated support',
      'Custom usage alerts',
      'Team collaboration features',
      'API access for usage data',
      'Custom integrations'
    ],
    limits: {
      tokens: 10000000,
      requests: 100000,
      cost: 100000 // in cents
    }
  }
} as const;

export function SubscriptionManager() {
  const { data: subscription, isLoading } = useUserSubscription();
  const { data: usageSummary } = useUsageSummary();
  const updateSubscription = useUpdateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise' | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading subscription...</div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = subscription?.planType || 'free';
  const isNearLimits = usageSummary?.some(q => q.usagePercentage >= 80) || false;
  const isOverLimits = usageSummary?.some(q => q.isOverLimit) || false;

  const handleUpgrade = async (planType: 'pro' | 'enterprise') => {
    try {
      await updateSubscription.mutateAsync({
        planType,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      setSelectedPlan(null);
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Subscription
                {currentPlan === 'enterprise' && <Crown className="h-5 w-5 text-yellow-500" />}
                {currentPlan === 'pro' && <Zap className="h-5 w-5 text-blue-500" />}
              </CardTitle>
              <CardDescription>
                Manage your VibeCraft Studio subscription
              </CardDescription>
            </div>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="text-lg px-3 py-1">
              {PLAN_FEATURES[currentPlan].name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && subscription.planType !== 'free' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Next billing: {subscription.currentPeriodEnd?.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatCurrency(PLAN_FEATURES[subscription.planType].price)}/month
                </span>
              </div>
            </div>
          )}

          {(isNearLimits || isOverLimits) && currentPlan === 'free' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isOverLimits 
                  ? "You've exceeded your usage limits. Upgrade to continue using AI features."
                  : "You're approaching your usage limits. Consider upgrading to avoid interruptions."
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PLAN_FEATURES).map(([planKey, plan]) => {
          const planType = planKey as keyof typeof PLAN_FEATURES;
          const isCurrentPlan = currentPlan === planType;
          const isSelected = selectedPlan === planType;

          return (
            <Card 
              key={planKey}
              className={`relative ${isCurrentPlan ? 'border-blue-500 bg-blue-50/50' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            >
              {planType === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  {plan.name}
                  {planType === 'enterprise' && <Crown className="h-5 w-5 text-yellow-500" />}
                  {planType === 'pro' && <Zap className="h-5 w-5 text-blue-500" />}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                  {plan.billing && <span className="text-sm font-normal text-muted-foreground">/{plan.billing}</span>}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Usage Limits (per provider)</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Tokens</span>
                      <span className="font-medium">{plan.limits.tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Requests</span>
                      <span className="font-medium">{plan.limits.requests.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cost Limit</span>
                      <span className="font-medium">{formatCurrency(plan.limits.cost / 100)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Features</h4>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : planType === 'free' ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUpgrade('free' as any)}
                      disabled={updateSubscription.isPending}
                    >
                      Downgrade to Free
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleUpgrade(planType)}
                      disabled={updateSubscription.isPending}
                    >
                      {updateSubscription.isPending ? 'Processing...' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Comparison */}
      {usageSummary && usageSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Usage vs Plan Limits</CardTitle>
            <CardDescription>
              See how your current usage compares to different plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageSummary.slice(0, 3).map((usage) => (
                <div key={`${usage.provider}-${usage.quotaType}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">
                      {usage.provider} {usage.quotaType}
                    </span>
                    <Badge variant={usage.isOverLimit ? 'destructive' : usage.isNearLimit ? 'secondary' : 'default'}>
                      {Math.round(usage.usagePercentage)}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {Object.entries(PLAN_FEATURES).map(([planKey, plan]) => {
                      const planType = planKey as keyof typeof PLAN_FEATURES;
                      const limit = plan.limits[usage.quotaType as keyof typeof plan.limits];
                      const percentage = (usage.currentUsage / limit) * 100;
                      
                      return (
                        <div key={planKey} className="text-center p-2 border rounded">
                          <div className="font-medium">{plan.name}</div>
                          <div className={`text-xs ${percentage >= 100 ? 'text-red-600' : percentage >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {Math.round(percentage)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {usage.currentUsage.toLocaleString()} / {limit.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}