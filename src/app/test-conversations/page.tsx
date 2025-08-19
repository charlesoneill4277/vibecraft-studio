'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useConversations } from '@/hooks/use-conversations';
import { createClient } from '@/lib/supabase/client';

export default function TestConversationsPage() {
  const {
    conversations,
    loading,
    error,
    currentConversation,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    refreshConversations,
    setCurrentConversation,
  } = useConversations();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>('');
  const [projectId, setProjectId] = useState('660e8400-e29b-41d4-a716-446655440000'); // Default test project
  const [conversationTitle, setConversationTitle] = useState('Test Conversation');

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('[Test] Auth check:', { user: user?.email, error });
      setUser(user);
      setAuthLoading(false);
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && projectId) {
      refreshConversations(projectId);
    }
  }, [user, projectId, refreshConversations]);

  const handleCreateConversation = async () => {
    try {
      setTestResult('Creating conversation...');
      console.log('[Test] Creating conversation:', { projectId, title: conversationTitle });
      
      const conversation = await createConversation(projectId, conversationTitle);
      
      setTestResult(`✅ Conversation created: ${conversation.id} - "${conversation.title}"`);
      setConversationTitle('Test Conversation ' + Date.now());
    } catch (error) {
      console.error('[Test] Create conversation failed:', error);
      setTestResult(`❌ Create conversation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGetConversation = async (conversationId: string) => {
    try {
      setTestResult('Getting conversation...');
      console.log('[Test] Getting conversation:', conversationId);
      
      const conversation = await getConversation(conversationId);
      
      if (conversation) {
        setCurrentConversation(conversation);
        setTestResult(`✅ Conversation retrieved: "${conversation.title}"`);
      } else {
        setTestResult('❌ Conversation not found');
      }
    } catch (error) {
      console.error('[Test] Get conversation failed:', error);
      setTestResult(`❌ Get conversation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateConversation = async (conversationId: string) => {
    try {
      setTestResult('Updating conversation...');
      console.log('[Test] Updating conversation:', conversationId);
      
      const updatedConversation = await updateConversation(conversationId, {
        title: `Updated ${Date.now()}`,
        description: 'Updated via test page'
      });
      
      setTestResult(`✅ Conversation updated: "${updatedConversation.title}"`);
    } catch (error) {
      console.error('[Test] Update conversation failed:', error);
      setTestResult(`❌ Update conversation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      setTestResult('Deleting conversation...');
      console.log('[Test] Deleting conversation:', conversationId);
      
      await deleteConversation(conversationId);
      
      setTestResult('✅ Conversation deleted successfully');
    } catch (error) {
      console.error('[Test] Delete conversation failed:', error);
      setTestResult(`❌ Delete conversation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshConversations = async () => {
    try {
      setTestResult('Refreshing conversations...');
      await refreshConversations(projectId);
      setTestResult('✅ Conversations refreshed');
    } catch (error) {
      console.error('[Test] Refresh failed:', error);
      setTestResult(`❌ Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (authLoading) {
    return <div className="container mx-auto p-6">Loading authentication...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to test conversations functionality.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversations API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>User:</strong> {user.email}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error || 'None'}</p>
            <p><strong>Conversations Count:</strong> {conversations.length}</p>
            <p><strong>Current Conversation:</strong> {currentConversation?.title || 'None'}</p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Project ID"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
              <Button onClick={handleRefreshConversations} disabled={loading}>
                Refresh
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Conversation Title"
                value={conversationTitle}
                onChange={(e) => setConversationTitle(e.target.value)}
              />
              <Button onClick={handleCreateConversation} disabled={loading}>
                Create Conversation
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="p-4 bg-gray-100 rounded">
              <p>{testResult}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Current Conversations:</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{conversation.title}</p>
                    <p className="text-sm text-gray-600">
                      Messages: {conversation.messageCount} | 
                      Last: {conversation.lastMessageAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGetConversation(conversation.id)}
                    >
                      Get
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateConversation(conversation.id)}
                    >
                      Update
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteConversation(conversation.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {conversations.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No conversations found. Create one to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}