'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Settings, Eye, EyeOff } from 'lucide-react';
import { AIProvider } from '@/types';
import { getProviderConfig } from '@/lib/ai/providers';

interface ProviderCardProps {
  provider: AIProvider;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSettings: (provider: AIProvider) => void;
}

export function ProviderCard({ provider, onToggle, onDelete, onSettings }: ProviderCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const config = getProviderConfig(provider.provider);

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await onToggle(provider.id, !provider.isActive);
    } catch (error) {
      console.error('Error toggling provider:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this AI provider? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDelete(provider.id);
    } catch (error) {
      console.error('Error deleting provider:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const maskedApiKey = showKey ? provider.apiKeyEncrypted : '••••••••••••••••';

  return (
    <Card className={`transition-all ${provider.isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            {config.displayName}
            {provider.isActive && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={provider.isActive}
            onCheckedChange={handleToggle}
            disabled={isToggling}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              API Key
            </label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
                {maskedApiKey}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Default Model
            </label>
            <p className="text-sm mt-1">{provider.settings.defaultModel}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Created {new Date(provider.createdAt || '').toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSettings(provider)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}