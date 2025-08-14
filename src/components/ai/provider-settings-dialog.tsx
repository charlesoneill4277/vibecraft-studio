'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { AIProvider } from '@/types';
import { getProviderConfig } from '@/lib/ai/providers';

interface ProviderSettingsDialogProps {
  provider: AIProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: { settings: any }) => Promise<void>;
}

export function ProviderSettingsDialog({ 
  provider, 
  open, 
  onOpenChange, 
  onUpdate 
}: ProviderSettingsDialogProps) {
  const [settings, setSettings] = useState({
    defaultModel: '',
    maxTokens: 4000,
    temperature: 0.7,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const config = provider ? getProviderConfig(provider.provider) : null;

  useEffect(() => {
    if (provider) {
      setSettings({
        defaultModel: provider.settings.defaultModel || config?.models[0]?.id || '',
        maxTokens: provider.settings.maxTokens || 4000,
        temperature: provider.settings.temperature || 0.7,
      });
    }
  }, [provider, config]);

  const handleUpdate = async () => {
    if (!provider) return;

    try {
      setIsUpdating(true);
      await onUpdate(provider.id, { settings });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating provider settings:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!provider || !config) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Provider Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {config.displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Default Model */}
          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Select 
              value={settings.defaultModel} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, defaultModel: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {config.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label>Max Tokens: {settings.maxTokens}</Label>
            <Slider
              value={[settings.maxTokens]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, maxTokens: value }))}
              max={8000}
              min={100}
              step={100}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100</span>
              <span>8000</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label>Temperature: {settings.temperature}</Label>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
              max={2}
              min={0}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 (Focused)</span>
              <span>2 (Creative)</span>
            </div>
          </div>

          {/* Model Info */}
          {settings.defaultModel && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Selected Model Info</h4>
              {(() => {
                const model = config.models.find(m => m.id === settings.defaultModel);
                if (!model) return null;
                
                return (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Max Context: {model.maxTokens.toLocaleString()} tokens</div>
                    <div>
                      Cost: ${model.costPer1kTokens.input}/1K input, ${model.costPer1kTokens.output}/1K output
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              'Update Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}