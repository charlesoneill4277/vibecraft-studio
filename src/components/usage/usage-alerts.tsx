'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  DollarSign, 
  Zap, 
  TrendingUp, 
  X,
  Check,
  Bell,
  BellOff
} from 'lucide-react';
import { 
  useUsageAlerts, 
  useMarkAlertAsRead, 
  useDismissAlert 
} from '@/hooks/use-usage';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { UsageAlert } from '@/types';

interface UsageAlertsProps {
  showUnreadOnly?: boolean;
  compact?: boolean;
}

export function UsageAlerts({ showUnreadOnly = false, compact = false }: UsageAlertsProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>(showUnreadOnly ? 'unread' : 'all');
  const { data: alerts, isLoading } = useUsageAlerts(filter === 'unread');
  const markAsRead = useMarkAlertAsRead();
  const dismissAlert = useDismissAlert();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-pulse">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Usage Alerts
          </CardTitle>
          <CardDescription>
            {filter === 'unread' ? 'No unread alerts' : 'No alerts to display'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <BellOff className="h-8 w-8 mb-2" />
            <p>All clear! No usage alerts at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Usage Alerts
              {alerts.length > 0 && (
                <Badge variant="secondary">{alerts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Monitor your usage limits and costs
            </CardDescription>
          </div>
          {!showUnreadOnly && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
              >
                Unread
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? "h-64" : "h-96"}>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <UsageAlertItem
                key={alert.id}
                alert={alert}
                onMarkRead={() => markAsRead.mutate(alert.id)}
                onDismiss={() => dismissAlert.mutate(alert.id)}
                compact={compact}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface UsageAlertItemProps {
  alert: UsageAlert;
  onMarkRead: () => void;
  onDismiss: () => void;
  compact?: boolean;
}

function UsageAlertItem({ alert, onMarkRead, onDismiss, compact = false }: UsageAlertItemProps) {
  const getAlertIcon = () => {
    switch (alert.alertType) {
      case 'quota_exceeded':
      case 'quota_warning':
        return <Zap className="h-4 w-4" />;
      case 'cost_warning':
        return <DollarSign className="h-4 w-4" />;
      case 'upgrade_prompt':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (): 'default' | 'destructive' => {
    return alert.alertType === 'quota_exceeded' ? 'destructive' : 'default';
  };

  const getAlertTitle = () => {
    switch (alert.alertType) {
      case 'quota_exceeded':
        return 'Quota Exceeded';
      case 'quota_warning':
        return 'Quota Warning';
      case 'cost_warning':
        return 'Cost Warning';
      case 'upgrade_prompt':
        return 'Upgrade Recommended';
      default:
        return 'Usage Alert';
    }
  };

  return (
    <Alert variant={getAlertVariant()} className={`relative ${!alert.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start gap-3">
        {getAlertIcon()}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <AlertTitle className="text-sm font-medium">
              {getAlertTitle()}
              {alert.provider && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {alert.provider}
                </Badge>
              )}
            </AlertTitle>
            <div className="flex items-center gap-1">
              {!alert.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onMarkRead}
                  className="h-6 w-6 p-0"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <AlertDescription className="text-sm">
            {alert.message}
          </AlertDescription>

          {!compact && (alert.currentUsage !== null || alert.limitValue !== null) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              {alert.currentUsage !== null && alert.limitValue !== null && (
                <span>
                  Usage: {formatNumber(alert.currentUsage)} / {formatNumber(alert.limitValue)}
                  {alert.thresholdPercentage && ` (${alert.thresholdPercentage}%)`}
                </span>
              )}
              <span>
                {new Date(alert.createdAt).toLocaleDateString()} at{' '}
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

// Compact version for navigation/header
export function UsageAlertsDropdown() {
  const { data: unreadAlerts } = useUsageAlerts(true);
  const markAsRead = useMarkAlertAsRead();
  const dismissAlert = useDismissAlert();

  if (!unreadAlerts?.length) {
    return null;
  }

  return (
    <div className="w-80 max-h-96 overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Usage Alerts</h4>
          <Badge variant="secondary">{unreadAlerts.length}</Badge>
        </div>
      </div>
      <ScrollArea className="h-80">
        <div className="p-3 space-y-3">
          {unreadAlerts.slice(0, 5).map((alert) => (
            <UsageAlertItem
              key={alert.id}
              alert={alert}
              onMarkRead={() => markAsRead.mutate(alert.id)}
              onDismiss={() => dismissAlert.mutate(alert.id)}
              compact={true}
            />
          ))}
          {unreadAlerts.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm">
                View {unreadAlerts.length - 5} more alerts
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}