import { AIProvider } from '@/types';

export type AIProviderType = 'openai' | 'anthropic' | 'straico' | 'cohere';

export interface AIProviderConfig {
  name: string;
  displayName: string;
  description: string;
  models: AIModel[];
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  baseUrl?: string;
  defaultSettings: {
    maxTokens: number;
    temperature: number;
  };
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

/**
 * Configuration for all supported AI providers
 */
export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT models from OpenAI including GPT-4 and GPT-3.5',
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model, best for complex tasks',
        maxTokens: 8192,
        costPer1kTokens: { input: 0.03, output: 0.06 }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Faster and more cost-effective than GPT-4',
        maxTokens: 128000,
        costPer1kTokens: { input: 0.01, output: 0.03 }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks',
        maxTokens: 16385,
        costPer1kTokens: { input: 0.0015, output: 0.002 }
      }
    ],
    defaultSettings: {
      maxTokens: 4000,
      temperature: 0.7
    }
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude models from Anthropic, known for safety and helpfulness',
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most powerful model for complex tasks',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.015, output: 0.075 }
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.003, output: 0.015 }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fastest model for simple tasks',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.00025, output: 0.00125 }
      }
    ],
    defaultSettings: {
      maxTokens: 4000,
      temperature: 0.7
    }
  },
  straico: {
    name: 'straico',
    displayName: 'Straico',
    description: 'Multi-model AI platform with access to various providers',
    apiKeyLabel: 'Straico API Key',
    apiKeyPlaceholder: 'your-straico-api-key',
    baseUrl: 'https://api.straico.com/v0',
    models: [
      {
        id: 'auto',
        name: 'Smart Model Selection',
        description: 'Let Straico choose the best model for your request',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.01, output: 0.03 }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4 (via Straico)',
        description: 'GPT-4 through Straico platform',
        maxTokens: 8192,
        costPer1kTokens: { input: 0.035, output: 0.07 }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo (via Straico)',
        description: 'GPT-3.5 Turbo through Straico platform',
        maxTokens: 16385,
        costPer1kTokens: { input: 0.002, output: 0.003 }
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus (via Straico)',
        description: 'Claude 3 Opus through Straico platform',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.02, output: 0.08 }
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet (via Straico)',
        description: 'Claude 3 Sonnet through Straico platform',
        maxTokens: 200000,
        costPer1kTokens: { input: 0.004, output: 0.018 }
      }
    ],
    defaultSettings: {
      maxTokens: 4000,
      temperature: 0.7
    }
  },
  cohere: {
    name: 'cohere',
    displayName: 'Cohere',
    description: 'Command models from Cohere for text generation and analysis',
    apiKeyLabel: 'Cohere API Key',
    apiKeyPlaceholder: 'co_...',
    baseUrl: 'https://api.cohere.ai/v1',
    models: [
      {
        id: 'command',
        name: 'Command',
        description: 'General purpose text generation model',
        maxTokens: 4096,
        costPer1kTokens: { input: 0.0015, output: 0.002 }
      },
      {
        id: 'command-light',
        name: 'Command Light',
        description: 'Faster, lighter version of Command',
        maxTokens: 4096,
        costPer1kTokens: { input: 0.0003, output: 0.0006 }
      }
    ],
    defaultSettings: {
      maxTokens: 4000,
      temperature: 0.7
    }
  }
};

/**
 * Get provider configuration by type
 */
export function getProviderConfig(provider: AIProviderType): AIProviderConfig {
  return AI_PROVIDERS[provider];
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): AIProviderType[] {
  return Object.keys(AI_PROVIDERS) as AIProviderType[];
}

/**
 * Get model configuration for a specific provider and model
 */
export function getModelConfig(provider: AIProviderType, modelId: string): AIModel | undefined {
  const providerConfig = AI_PROVIDERS[provider];
  return providerConfig.models.find(model => model.id === modelId);
}

/**
 * Validate API key format for a provider
 */
export function validateApiKeyFormat(provider: AIProviderType, apiKey: string): boolean {
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    case 'straico':
      // Straico API keys don't require a specific prefix, just need to be non-empty and reasonable length
      return apiKey.length > 10;
    case 'cohere':
      return apiKey.startsWith('co_') && apiKey.length > 20;
    default:
      return false;
  }
}

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  provider: AIProviderType,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelConfig(provider, modelId);
  if (!model) return 0;
  
  const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output;
  
  return inputCost + outputCost;
}