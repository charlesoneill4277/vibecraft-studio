'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useAIProviders } from '@/hooks/use-ai-providers';
import { ProviderCard } from './provider-card';
import { AddProviderDialog } from './add-provider-dialog';
import { ProviderSettingsDialog } from './provider-settings-dialog';
import { AIProvider } from '@/types';

export function ProvidersManager() {
  const {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testApiKey,
  } = useAIProviders();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [settingsProvider, setSettingsProvider] = useState<AIProvider | null>(null);

  const handleToggleProvider = async (id: string, isActive: boolean) => {
    await updateProvider(id, { isActive });
  };

  const handleDeleteProvider = async (id: string) => {
    await deleteProvider(id);
  };

  const handleSettingsProvider = (provider: AIProvider) => {
    setSettingsProvider(provider);
  };

  const handleUpdateSettings = async (id: string, updates: { settings: any }) => {
    await updateProvider(id, updates);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Providers</h2>
          <p className="text-muted-foreground">
            Manage your AI provider configurations and API keys
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {providers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No AI Providers Configured</CardTitle>
            <CardDescription>
              Add your first AI provider to start using AI features in your projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onToggle={handleToggleProvider}
              onDelete={handleDeleteProvider}
              onSettings={handleSettingsProvider}
            />
          ))}
        </div>
      )}

      <AddProviderDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={createProvider}
        onTestApiKey={testApiKey}
      />

      <ProviderSettingsDialog
        provider={settingsProvider}
        open={!!settingsProvider}
        onOpenChange={(open) => !open && setSettingsProvider(null)}
        onUpdate={handleUpdateSettings}
      />
    </div>
  );
}