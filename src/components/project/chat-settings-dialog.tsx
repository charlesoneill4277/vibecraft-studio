'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Settings, Brain, Zap } from 'lucide-react'
import { useAIProviders } from '@/hooks/use-ai-providers'
import { Project } from '@/hooks/use-projects'

interface ChatSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  onSettingsUpdate?: (settings: ChatSettings) => void
}

interface ChatSettings {
  defaultProvider?: string
  defaultModel?: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
  autoSave: boolean
  streamingEnabled: boolean
  contextInjection: {
    enabled: boolean
    autoInjectKnowledge: boolean
    autoInjectCode: boolean
    autoInjectAssets: boolean
    maxContextItems: number
    minRelevanceScore: number
  }
}

const defaultSettings: ChatSettings = {
  temperature: 0.7,
  maxTokens: 4000,
  autoSave: true,
  streamingEnabled: true,
  contextInjection: {
    enabled: true,
    autoInjectKnowledge: true,
    autoInjectCode: false,
    autoInjectAssets: false,
    maxContextItems: 5,
    minRelevanceScore: 0.5
  }
}

export function ChatSettingsDialog({ 
  open, 
  onOpenChange, 
  project,
  onSettingsUpdate 
}: ChatSettingsDialogProps) {
  const { providers, loading: providersLoading } = useAIProviders()
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)

  const activeProviders = providers.filter(p => p.isActive)

  // Load existing settings from project
  useEffect(() => {
    if (project.settings) {
      const projectSettings = project.settings as any
      setSettings({
        defaultProvider: projectSettings.defaultAIProvider,
        defaultModel: projectSettings.defaultModel,
        temperature: projectSettings.temperature || defaultSettings.temperature,
        maxTokens: projectSettings.maxTokens || defaultSettings.maxTokens,
        systemPrompt: projectSettings.systemPrompt,
        autoSave: projectSettings.autoSave ?? defaultSettings.autoSave,
        streamingEnabled: projectSettings.streamingEnabled ?? defaultSettings.streamingEnabled,
        contextInjection: {
          enabled: projectSettings.context_settings?.enabled ?? defaultSettings.contextInjection.enabled,
          autoInjectKnowledge: projectSettings.context_settings?.auto_inject_knowledge ?? defaultSettings.contextInjection.autoInjectKnowledge,
          autoInjectCode: projectSettings.context_settings?.auto_inject_code ?? defaultSettings.contextInjection.autoInjectCode,
          autoInjectAssets: projectSettings.context_settings?.auto_inject_assets ?? defaultSettings.contextInjection.autoInjectAssets,
          maxContextItems: projectSettings.context_settings?.max_context_items ?? defaultSettings.contextInjection.maxContextItems,
          minRelevanceScore: projectSettings.context_settings?.min_relevance_score ?? defaultSettings.contextInjection.minRelevanceScore
        }
      })
    }
  }, [project.settings])

  const selectedProvider = activeProviders.find(p => p.id === settings.defaultProvider)
  const availableModels = selectedProvider?.settings?.models || []

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Update project settings via API
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            ...project.settings,
            defaultAIProvider: settings.defaultProvider,
            defaultModel: settings.defaultModel,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            systemPrompt: settings.systemPrompt,
            autoSave: settings.autoSave,
            streamingEnabled: settings.streamingEnabled,
            context_settings: {
              enabled: settings.contextInjection.enabled,
              auto_inject_knowledge: settings.contextInjection.autoInjectKnowledge,
              auto_inject_code: settings.contextInjection.autoInjectCode,
              auto_inject_assets: settings.contextInjection.autoInjectAssets,
              max_context_items: settings.contextInjection.maxContextItems,
              min_relevance_score: settings.contextInjection.minRelevanceScore
            }
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project settings')
      }

      onSettingsUpdate?.(settings)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving chat settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chat Settings
          </DialogTitle>
          <DialogDescription>
            Configure AI chat settings for "{project.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Provider Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Provider
              </CardTitle>
              <CardDescription>
                Choose your default AI provider and model for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {providersLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeProviders.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  <p>No active AI providers found.</p>
                  <p className="text-sm">Configure providers first to use chat settings.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Default Provider</Label>
                    <Select 
                      value={settings.defaultProvider} 
                      onValueChange={(value) => setSettings(prev => ({ 
                        ...prev, 
                        defaultProvider: value,
                        defaultModel: undefined // Reset model when provider changes
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProvider && availableModels.length > 0 && (
                    <div className="space-y-2">
                      <Label>Default Model</Label>
                      <Select 
                        value={settings.defaultModel} 
                        onValueChange={(value) => setSettings(prev => ({ ...prev, defaultModel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model: any) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Temperature: {settings.temperature}</Label>
                    <Slider
                      value={[settings.temperature]}
                      onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values make responses more creative, lower values more focused
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens: {settings.maxTokens}</Label>
                    <Slider
                      value={[settings.maxTokens]}
                      onValueChange={([value]) => setSettings(prev => ({ ...prev, maxTokens: value }))}
                      max={8000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum length of AI responses
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Chat Behavior */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chat Behavior</CardTitle>
              <CardDescription>
                Configure how the chat interface behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save conversations</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically save chat messages
                  </p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSave: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Streaming responses</Label>
                  <p className="text-xs text-muted-foreground">
                    Show AI responses as they're generated
                  </p>
                </div>
                <Switch
                  checked={settings.streamingEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, streamingEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Context Injection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Context Injection
              </CardTitle>
              <CardDescription>
                Configure how project context is automatically included in conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable context injection</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically include relevant project context
                  </p>
                </div>
                <Switch
                  checked={settings.contextInjection.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    contextInjection: { ...prev.contextInjection, enabled: checked }
                  }))}
                />
              </div>

              {settings.contextInjection.enabled && (
                <>
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-inject knowledge base</Label>
                      <p className="text-xs text-muted-foreground">
                        Include relevant documentation
                      </p>
                    </div>
                    <Switch
                      checked={settings.contextInjection.autoInjectKnowledge}
                      onCheckedChange={(checked) => setSettings(prev => ({ 
                        ...prev, 
                        contextInjection: { ...prev.contextInjection, autoInjectKnowledge: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-inject code files</Label>
                      <p className="text-xs text-muted-foreground">
                        Include relevant code snippets
                      </p>
                    </div>
                    <Switch
                      checked={settings.contextInjection.autoInjectCode}
                      onCheckedChange={(checked) => setSettings(prev => ({ 
                        ...prev, 
                        contextInjection: { ...prev.contextInjection, autoInjectCode: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-inject assets</Label>
                      <p className="text-xs text-muted-foreground">
                        Include relevant project assets
                      </p>
                    </div>
                    <Switch
                      checked={settings.contextInjection.autoInjectAssets}
                      onCheckedChange={(checked) => setSettings(prev => ({ 
                        ...prev, 
                        contextInjection: { ...prev.contextInjection, autoInjectAssets: checked }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max context items: {settings.contextInjection.maxContextItems}</Label>
                    <Slider
                      value={[settings.contextInjection.maxContextItems]}
                      onValueChange={([value]) => setSettings(prev => ({ 
                        ...prev, 
                        contextInjection: { ...prev.contextInjection, maxContextItems: value }
                      }))}
                      max={20}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min relevance score: {settings.contextInjection.minRelevanceScore}</Label>
                    <Slider
                      value={[settings.contextInjection.minRelevanceScore]}
                      onValueChange={([value]) => setSettings(prev => ({ 
                        ...prev, 
                        contextInjection: { ...prev.contextInjection, minRelevanceScore: value }
                      }))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum relevance score for context items to be included
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}