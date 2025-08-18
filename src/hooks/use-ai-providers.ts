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
      
      console.log('[Frontend] Fetching providers from /api/ai/providers');
      const response = await fetch('/api/ai/providers');
      console.log('[Frontend] Fetch providers response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI providers');
      }
      
      const data = await response.json();
      console.log('[Frontend] Providers data received:', data);
      
      // Handle the new response format from withAPIErrorHandling
      let providers = [];
      if (data.success === true && data.data && data.data.providers) {
        providers = data.data.providers;
      } else if (data.providers) {
        providers = data.providers;
      }
      
      console.log('[Frontend] Parsed providers:', {
        providersCount: providers.length
      });
      setProviders(providers);
    } catch (err) {
      console.error('[Frontend] fetchProviders error:', err);
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
      
      // Enhanced frontend logging for debugging
      console.log('[Frontend] Starting createProvider request');
      console.log('[Frontend] Request details:', {
        provider,
        apiKeyLength: typeof apiKey === 'string' ? apiKey.length : 0,
        hasSettings: !!settings,
        url: '/api/ai/providers',
        method: 'POST'
      });
      
      // Log the actual fetch attempt
      console.log('[Frontend] Making fetch request to /api/ai/providers');
      
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Log response details immediately
      console.log('[Frontend] Received response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create provider';
        try {
          const errorData = await response.json();
          // Handle the new error response format from withAPIErrorHandling
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          console.error('[Frontend] Server error response:', {
            status: response.status,
            errorData
          });
        } catch (parseErr) {
          console.error('[Frontend] Could not parse error JSON:', parseErr);
          try {
            const responseText = await response.text();
            console.error('[Frontend] Raw response text:', responseText);
          } catch (textErr) {
            console.error('[Frontend] Could not read response text:', textErr);
          }
        }
        throw new Error(errorMessage);
      }

      // Parse success response
      try {
        const respData = await response.json();
        console.log('[Frontend] Success response data:', respData);
        
        // Handle the new success response format from withAPIErrorHandling
        if (respData.success === false) {
          const msg = respData.error?.message || respData.message || 'Provider creation failed';
          console.error('[Frontend] Non-success response on 2xx status:', respData);
          throw new Error(msg);
        }
        
        // Check if we have the expected data structure
        if (respData.success === true && respData.data) {
          console.log('[Frontend] Provider created successfully (new format), refreshing list');
        } else if (respData.success === true || respData.provider) {
          console.log('[Frontend] Provider created successfully (legacy format), refreshing list');
        } else {
          console.warn('[Frontend] Unexpected response format, but continuing:', respData);
        }
      } catch (jsonErr) {
        console.error('[Frontend] JSON parse/validation issue:', jsonErr);
        // Continue anyway - the request might have succeeded
      }

      await fetchProviders(); // Refresh the list
      console.log('[Frontend] Provider creation completed successfully');
      
    } catch (err) {
      console.error('[Frontend] createProvider error:', err);
      console.error('[Frontend] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
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