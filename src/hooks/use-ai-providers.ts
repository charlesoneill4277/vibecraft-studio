import { useState, useEffect } from 'react';
import { AIProvider } from '@/types';
import { AIProviderType } from '@/lib/ai/providers';

interface UseAIProvidersReturn {
  providers: AIProvider[];
  loading: boolean;
  error: string | null;
  createProvider: (provider: AIProviderType, apiKey: string, settings?: any) => Promise<void>;
  updateProvider: (id: string, updates: { isActive?: boolean; settings?: any }) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  testApiKey: (provider: AIProviderType, apiKey: string) => Promise<{ valid: boolean; error?: string }>;
  refreshProviders: () => Promise<void>;
}

export function useAIProviders(): UseAIProvidersReturn {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch AI providers');
      }
      
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createProvider = async (
    provider: AIProviderType, 
    apiKey: string, 
    settings?: any
  ) => {
    try {
      setError(null);
      const payload = { provider, apiKey, settings };
      console.log('[AI Providers] createProvider payload (apiKey length only):', {
        provider,
        apiKeyLength: typeof apiKey === 'string' ? apiKey.length : 0,
        hasSettings: !!settings,
      });
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create provider';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.warn('[AI Providers] createProvider server error response:', errorData);
        } catch (parseErr) {
          console.warn('[AI Providers] createProvider could not parse error JSON', parseErr);
        }
        throw new Error(errorMessage);
      }

      await fetchProviders(); // Refresh the list
    } catch (err) {
      console.dir(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err; // rethrow so caller UI can react
    }
  };

  const updateProvider = async (
    id: string, 
    updates: { isActive?: boolean; settings?: any }
  ) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/ai/providers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update provider');
      }

      await fetchProviders(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/ai/providers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete provider');
      }

      await fetchProviders(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const testApiKey = async (provider: AIProviderType, apiKey: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/ai/providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await response.json();
      if (response.ok && (data.success || data.valid)) {
        return { valid: true };
      }
      const msg = data.message || data.error || `API key test failed (status ${response.status})`;
      return { valid: false, error: msg };
    } catch (err) {
      console.error('Error testing API key:', err);
      return { valid: false, error: 'Failed to test API key. Please check your connection.' };
    }
  };

  const refreshProviders = async () => {
    await fetchProviders();
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testApiKey,
    refreshProviders,
  };
}