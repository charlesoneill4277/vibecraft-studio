import { 
  getProviderConfig, 
  getAvailableProviders, 
  getModelConfig, 
  validateApiKeyFormat, 
  calculateCost 
} from '../providers';

describe('AI Providers', () => {
  test('should return all available providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('straico');
    expect(providers).toContain('cohere');
  });

  test('should get provider configuration', () => {
    const openaiConfig = getProviderConfig('openai');
    expect(openaiConfig.name).toBe('openai');
    expect(openaiConfig.displayName).toBe('OpenAI');
    expect(openaiConfig.models.length).toBeGreaterThan(0);
  });

  test('should get model configuration', () => {
    const gpt4Model = getModelConfig('openai', 'gpt-4');
    expect(gpt4Model).toBeDefined();
    expect(gpt4Model?.name).toBe('GPT-4');
  });

  test('should validate API key formats', () => {
    expect(validateApiKeyFormat('openai', 'sk-1234567890abcdef1234567890abcdef')).toBe(true);
    expect(validateApiKeyFormat('openai', 'invalid-key')).toBe(false);
    
    expect(validateApiKeyFormat('anthropic', 'sk-ant-1234567890abcdef1234567890abcdef')).toBe(true);
    expect(validateApiKeyFormat('anthropic', 'invalid-key')).toBe(false);
    
    expect(validateApiKeyFormat('straico', 'straico_1234567890abcdef1234567890abcdef')).toBe(true);
    expect(validateApiKeyFormat('cohere', 'co_1234567890abcdef1234567890abcdef')).toBe(true);
  });

  test('should calculate costs correctly', () => {
    const cost = calculateCost('openai', 'gpt-4', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(typeof cost).toBe('number');
  });
});