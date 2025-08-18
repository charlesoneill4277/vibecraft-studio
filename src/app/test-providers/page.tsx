'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIProviders } from '@/hooks/use-ai-providers';
import { createClient } from '@/lib/supabase/client';

export default function TestProvidersPage() {
  const {
    providers,
    loading,
    error,
    createProvider,
    testApiKey,
  } = useAIProviders();

  const [testResult, setTestResult] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  const handleLogin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: 'collaborator@vibecraft.studio',
      password: 'password123' // You'll need to set this
    });
    
    if (error) {
      console.error('Login failed:', error);
      setTestResult(`❌ Login failed: ${error.message}`);
    } else {
      setTestResult('✅ Login successful');
      window.location.reload();
    }
  };

  const handleTestCreate = async () => {
    try {
      setTestResult('Testing provider creation...');
      console.log('[Test] Starting provider creation test');
      
      await createProvider('openai', 'test-api-key-12345', {
        maxTokens: 4000,
        temperature: 0.7
      });
      
      setTestResult('✅ Provider creation test completed successfully!');
    } catch (error) {
      console.error('[Test] Provider creation failed:', error);
      setTestResult(`❌ Provider creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestApiKey = async () => {
    try {
      setTestResult('Testing API key validation...');
      console.log('[Test] Starting API key test');
      
      const result = await testApiKey('openai', 'test-api-key-12345');
      
      setTestResult(`API Key Test Result: ${result.valid ? '✅ Valid' : '❌ Invalid'} ${result.error ? `- ${result.error}` : ''}`);
    } catch (error) {
      console.error('[Test] API key test failed:', error);
      setTestResult(`❌ API key test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (authLoading) {
    return <div className="container mx-auto p-6">Loading authentication...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Providers API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error || 'None'}</p>
            <p><strong>Providers Count:</strong> {providers.length}</p>
          </div>

          {!user ? (
            <div className="space-y-2">
              <p className="text-red-600">⚠️ You need to be logged in to test the API</p>
              <Button onClick={handleLogin}>
                Login as Test User
              </Button>
            </div>
          ) : (
            <div className="space-x-2">
              <Button onClick={handleTestCreate} disabled={loading}>
                Test Create Provider
              </Button>
              <Button onClick={handleTestApiKey} disabled={loading}>
                Test API Key Validation
              </Button>
            </div>
          )}

          {testResult && (
            <div className="p-4 bg-gray-100 rounded">
              <p>{testResult}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Current Providers:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(providers, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}