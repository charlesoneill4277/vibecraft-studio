import { db, ServerDatabaseClient } from '@/lib/supabase/database';
import { encrypt, decrypt } from './encryption';
import { AIProviderType, validateApiKeyFormat, getProviderConfig } from './providers';
import type { AIProvider } from '@/types';

export class AIProviderService {
  /**
   * Create a new AI provider configuration
   */
  async createProvider(
    userId: string,
    provider: AIProviderType,
    apiKey: string,
    settings?: Partial<AIProvider['settings']>,
    serverDb?: ServerDatabaseClient
  ): Promise<AIProvider> {
    console.log('[AIProviderService] createProvider invoked', { userId, provider, hasSettings: !!settings });
    // Validate API key format
    if (!validateApiKeyFormat(provider, apiKey)) {
      throw new Error(`Invalid API key format for ${provider}`);
    }

    // Get default settings for the provider
    const providerConfig = getProviderConfig(provider);
    const defaultSettings = {
      defaultModel: providerConfig.models[0].id,
      maxTokens: providerConfig.defaultSettings.maxTokens,
      temperature: providerConfig.defaultSettings.temperature,
      ...settings
    };

    // Encrypt the API key
    let encryptedApiKey: string;
    try {
      encryptedApiKey = encrypt(apiKey);
    } catch (e: any) {
      console.error('[AIProviderService] encryption failure', { message: e?.message });
      throw new Error('Failed to encrypt API key');
    }
    if (!encryptedApiKey || typeof encryptedApiKey !== 'string') {
      console.error('[AIProviderService] encryption produced invalid value');
      throw new Error('Encryption returned invalid value');
    }
    console.log('[AIProviderService] encrypted key prepared', { length: encryptedApiKey.length });

    // Check if provider already exists for this user
    console.info('[AIProviderService] createProvider start', { userId, provider });
  const dataClient = serverDb ?? db;
  let existingProviders: any[] = [];
  try {
    existingProviders = await (dataClient as any).getAIProviders(userId);
  } catch (e: any) {
    console.error('[AIProviderService] getAIProviders failed', { message: e?.message, code: e?.code });
    throw e;
  }
  const existingProvider = existingProviders.find(p => p.provider === provider && p.user_id === userId);
    
    if (existingProvider) {
      console.info('[AIProviderService] existing provider found, updating', { id: existingProvider.id });
      // Update existing provider using the correct database client
      const updatedProvider = await (dataClient as any).updateAIProvider(existingProvider.id, {
        api_key_encrypted: encryptedApiKey,
        is_active: true,
        settings: defaultSettings
      });
      console.info('[AIProviderService] provider updated successfully', { id: updatedProvider.id });
      return this.mapDatabaseToType(updatedProvider);
    }

    // Create new provider
    console.info('[AIProviderService] inserting new provider', {
      user_id: userId,
      provider,
      settings: defaultSettings,
      keyLen: encryptedApiKey.length
    });
    let newProvider;
    try {
      newProvider = await (dataClient as any).createAIProvider({
        user_id: userId,
        provider,
        api_key_encrypted: encryptedApiKey,
        is_active: true,
        settings: defaultSettings
      });
    } catch (e: any) {
      console.error('[AIProviderService] insert failed', { message: e?.message, code: e?.code });
      throw e;
    }
    if (!newProvider) {
      console.error('[AIProviderService] insert returned no provider and no error');
      throw new Error('Insert returned no data');
    }
    console.info('[AIProviderService] new provider inserted', { id: newProvider.id });

    return this.mapDatabaseToType(newProvider);
  }

  /**
   * Get all AI providers for a user
   */
  async getProviders(userId?: string): Promise<AIProvider[]> {
    const providers = await db.getAIProviders(userId);
    return providers.map(this.mapDatabaseToType);
  }

  /**
   * Get a specific AI provider by ID
   */
  async getProvider(id: string): Promise<AIProvider | null> {
    const providers = await db.getAIProviders();
    const provider = providers.find(p => p.id === id);
    return provider ? this.mapDatabaseToType(provider) : null;
  }

  /**
   * Update an AI provider
   */
  async updateProvider(
    id: string,
    updates: {
      api_key_encrypted?: string;
      is_active?: boolean;
      settings?: any;
    }
  ): Promise<AIProvider> {
  const updatedProvider = await db.updateAIProvider(id, updates);
    return this.mapDatabaseToType(updatedProvider);
  }

  /**
   * Delete an AI provider
   */
  async deleteProvider(id: string): Promise<void> {
    await db.deleteAIProvider(id);
  }

  /**
   * Get decrypted API key for a provider (server-side only)
   */
  async getDecryptedApiKey(id: string): Promise<string> {
    const provider = await this.getProvider(id);
    if (!provider) {
      throw new Error('Provider not found');
    }

    try {
      return decrypt(provider.apiKeyEncrypted);
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Test an API key by making a simple request
   */
  async testApiKey(provider: AIProviderType, apiKey: string): Promise<boolean> {
    // This would make a simple test request to the provider's API
    // For now, we'll just validate the format
    return validateApiKeyFormat(provider, apiKey);
  }

  /**
   * Set a provider as active/inactive
   */
  async toggleProvider(id: string, isActive: boolean): Promise<AIProvider> {
    return await this.updateProvider(id, { is_active: isActive });
  }

  /**
   * Get the active provider for a user
   */
  async getActiveProvider(userId?: string): Promise<AIProvider | null> {
    const providers = await this.getProviders(userId);
    return providers.find(p => p.isActive) || null;
  }

  /**
   * Map database row to TypeScript type
   */
  private mapDatabaseToType(dbProvider: any): AIProvider {
    return {
      id: dbProvider.id,
      userId: dbProvider.user_id,
      provider: dbProvider.provider as AIProviderType,
      apiKeyEncrypted: dbProvider.api_key_encrypted,
      isActive: dbProvider.is_active,
      settings: dbProvider.settings || {}
    };
  }
}

// Export singleton instance
export const aiProviderService = new AIProviderService();