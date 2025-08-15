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
      
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey, settings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create provider');
      }

      await fetchProviders(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
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
      
      if (data.valid === true) {
        return { valid: true };
      } else {
        return { valid: false, error: data.error || 'API key test failed' };
      }
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