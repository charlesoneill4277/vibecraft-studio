'use client';

import { ProvidersManager } from '@/components/ai/providers-manager';
import { UsageDashboard } from '@/components/ai/usage-dashboard';
import { ChatInterface } from '@/components/ai/chat-interface';
import { EnhancedChatInterface } from '@/components/ai/enhanced-chat-interface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TestAIPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Provider Configuration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test page for AI provider management and usage tracking components
        </p>
      </div>

      <Tabs defaultValue="enhanced" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Basic Chat</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced Chat</TabsTrigger>
          <TabsTrigger value="providers">AI Providers</TabsTrigger>
          <TabsTrigger value="usage">Usage Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatInterface 
            projectId="test-project-123" 
            systemPrompt="You are a helpful AI assistant for web development projects."
          />
        </TabsContent>

        <TabsContent value="enhanced">
          <EnhancedChatInterface 
            projectId="test-project-123" 
            systemPrompt="You are a helpful AI assistant for web development projects with fallback and caching capabilities."
          />
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersManager />
        </TabsContent>

        <TabsContent value="usage">
          <UsageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}