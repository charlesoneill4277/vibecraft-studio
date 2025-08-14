import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsageDashboard } from '@/components/usage/usage-dashboard';
import { UsageAlerts } from '@/components/usage/usage-alerts';
import { QuotaProgress } from '@/components/usage/quota-progress';
import { SubscriptionManager } from '@/components/usage/subscription-manager';

export const metadata: Metadata = {
  title: 'Usage Dashboard - VibeCraft Studio',
  description: 'Monitor your AI usage, costs, and quotas',
};

export default function UsagePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AI usage, quotas, and subscription
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <UsageDashboard />
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <QuotaProgress />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <UsageAlerts />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}