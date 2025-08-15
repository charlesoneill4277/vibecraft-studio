'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProvidersManager } from '@/components/ai/providers-manager'
import { Settings, Zap, Plus } from 'lucide-react'

interface ProviderConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProviderConfigDialog({ 
  open, 
  onOpenChange 
}: ProviderConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configure AI Providers
          </DialogTitle>
          <DialogDescription>
            Manage your AI provider configurations and API keys to enable chat functionality.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="providers" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="providers" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Providers
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Getting Started
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="providers" className="h-full overflow-auto mt-4">
              <ProvidersManager />
            </TabsContent>
            
            <TabsContent value="help" className="mt-4 space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Getting Started with AI Providers</h3>
                  <p className="text-muted-foreground">
                    To use AI chat functionality, you need to configure at least one AI provider with your API key.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">🤖 OpenAI</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Access GPT-3.5 and GPT-4 models. Get your API key from the OpenAI platform.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                        Get OpenAI API Key
                      </a>
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">🧠 Anthropic</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Access Claude models. Get your API key from the Anthropic console.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                        Get Anthropic API Key
                      </a>
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">⚡ Straico</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Access multiple AI models through a single API. Get your API key from Straico.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://platform.straico.com/" target="_blank" rel="noopener noreferrer">
                        Get Straico API Key
                      </a>
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">🔮 Cohere</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Access Cohere's Command models. Get your API key from the Cohere dashboard.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.cohere.ai/api-keys" target="_blank" rel="noopener noreferrer">
                        Get Cohere API Key
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">🔒 Security Note</h4>
                  <p className="text-sm text-muted-foreground">
                    Your API keys are encrypted and stored securely. They are only used to make requests to the respective AI providers on your behalf.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                  <h4 className="font-medium mb-2">💡 Pro Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    You can configure multiple providers and switch between them in your chat settings. Each provider offers different models with unique capabilities.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}