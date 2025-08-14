import { db } from '@/lib/supabase/database';
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
    settings?: Partial<AIProvider['settings']>
  ): Promise<AIProvider> {
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
    const encryptedApiKey = encrypt(apiKey);

    // Check if provider already exists for this user
    const existingProviders = await db.getAIProviders();
    const existingProvider = existingProviders.find(p => p.provider === provider);
    
    if (existingProvider) {
      // Update existing provider
      return await this.updateProvider(existingProvider.id, {
        api_key_encrypted: encryptedApiKey,
        is_active: true,
        settings: defaultSettings
      });
    }

    // Create new provider
    const newProvider = await db.createAIProvider({
      user_id: userId,
      provider,
      api_key_encrypted: encryptedApiKey,
      is_active: true,
      settings: defaultSettings
    });

    return this.mapDatabaseToType(newProvider);
  }

  /**
   * Get all AI providers for a user
   */
  async getProviders(userId?: string): Promise<AIProvider[]> {
    const providers = await db.getAIProviders();
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