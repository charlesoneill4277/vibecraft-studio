'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AIProviderType, getAvailableProviders, getProviderConfig } from '@/lib/ai/providers';

interface AddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (provider: AIProviderType, apiKey: string, settings?: any) => Promise<void>;
  onTestApiKey: (provider: AIProviderType, apiKey: string) => Promise<{ valid: boolean; error?: string }>;
}

export function AddProviderDialog({ open, onOpenChange, onAdd, onTestApiKey }: AddProviderDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState({
    maxTokens: 4000,
    temperature: 0.7,
  });
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<boolean | null>(null);
  const [keyTestError, setKeyTestError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const availableProviders = getAvailableProviders();
  const selectedConfig = getProviderConfig(selectedProvider);

  const handleProviderChange = (provider: AIProviderType) => {
    setSelectedProvider(provider);
    setApiKey('');
    setKeyTestResult(null);
    setKeyTestError(null);
    
    const config = getProviderConfig(provider);
    setSettings({
      maxTokens: config.defaultSettings.maxTokens,
      temperature: config.defaultSettings.temperature,
    });
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) return;

    try {
      setIsTestingKey(true);
      setKeyTestError(null);
      const result = await onTestApiKey(selectedProvider, apiKey);
      setKeyTestResult(result.valid);
      if (!result.valid && result.error) {
        setKeyTestError(result.error);
      }
    } catch (error) {
      setKeyTestResult(false);
      setKeyTestError('Failed to test API key. Please try again.');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleAdd = async () => {
    if (!apiKey.trim() || keyTestResult !== true) return;

    try {
      setIsAdding(true);
      
      const providerSettings = {
        defaultModel: selectedConfig.models[0].id,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
      };

      await onAdd(selectedProvider, apiKey, providerSettings);
      
      // Reset form
      setApiKey('');
      setKeyTestResult(null);
      setKeyTestError(null);
      setSettings({
        maxTokens: 4000,
        temperature: 0.7,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding provider:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogDescription>
            Configure a new AI provider to use in your projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => {
                  const config = getProviderConfig(provider);
                  return (
                    <SelectItem key={provider} value={provider}>
                      {config.displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selectedConfig.displayName}</CardTitle>
              <CardDescription>{selectedConfig.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Available Models:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedConfig.models.map((model) => (
                    <div key={model.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground">{model.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">{selectedConfig.apiKeyLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                placeholder={selectedConfig.apiKeyPlaceholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyTestResult(null);
                  setKeyTestError(null);
                }}
              />
              <Button
                variant="outline"
                onClick={handleTestApiKey}
                disabled={!apiKey.trim() || isTestingKey}
              >
                {isTestingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            {keyTestResult !== null && (
              <div className="flex items-center gap-2 text-sm">
                {keyTestResult ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">API key is valid and working</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">
                      {keyTestError || 'API key test failed'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Default Settings</h3>
            
            <div className="space-y-2">
              <Label>Max Tokens: {settings.maxTokens}</Label>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, maxTokens: value }))}
                max={8000}
                min={100}
                step={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Temperature: {settings.temperature}</Label>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
                max={2}
                min={0}
                step={0.1}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!apiKey.trim() || keyTestResult !== true || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Provider'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}