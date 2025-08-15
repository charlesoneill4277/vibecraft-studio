# Straico AI Provider Integration

This document explains how to set up and use the Straico AI provider integration in VibeCraft Studio.

## Overview

Straico is a multi-model AI platform that provides access to various AI models through a single API. Our integration allows you to use models from OpenAI, Anthropic, and other providers through Straico's unified interface.

## Setup

### 1. Get Your Straico API Key

1. Visit [Straico Platform](https://platform.straico.com/)
2. Sign up for an account or log in
3. Navigate to your API settings
4. Generate a new API key
5. Copy the API key (it should start with `sk-`)

### 2. Configure the API Key

#### Option A: Environment Variable (Recommended for Development)
```bash
export STRAICO_API_KEY=sk-your-actual-api-key-here
```

#### Option B: Through the VibeCraft Studio UI
1. Go to your project settings
2. Navigate to AI Provider Configuration
3. Select "Straico" as your provider
4. Enter your API key in the format: `sk-...`
5. Click "Test Connection" to verify
6. Save your configuration

## Supported Models

The Straico integration supports the following models:

### OpenAI Models (via Straico)
- **GPT-4** (`openai/gpt-4`)
  - Max tokens: 8,192
  - Best for complex reasoning tasks
  
- **GPT-3.5 Turbo** (`openai/gpt-3.5-turbo`)
  - Max tokens: 16,385
  - Fast and cost-effective for most tasks

### Anthropic Models (via Straico)
- **Claude 3 Opus** (`anthropic/claude-3-opus`)
  - Max tokens: 200,000
  - Most powerful model for complex tasks
  
- **Claude 3 Sonnet** (`anthropic/claude-3-sonnet`)
  - Max tokens: 200,000
  - Balanced performance and speed

## API Key Format

Straico API keys can be used directly without any specific prefix requirement:
- **Format**: Any alphanumeric string provided by Straico
- **Length**: At least 10 characters
- **Example**: `your-straico-api-key-12345`

## Testing Your Integration

### Quick Test
Run the basic integration test:
```bash
npm run ai:test-straico
```

### Comprehensive Test
Run the full integration test with your API key:
```bash
STRAICO_API_KEY=your_key npm run ai:test-straico-comprehensive
```

### Manual API Test
You can test the API connection manually using the provider test endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/providers/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token" \
  -d '{
    "provider": "straico",
    "apiKey": "sk-your-api-key-here"
  }'
```

## Error Handling

The integration includes comprehensive error handling for common issues:

### Invalid API Key Format
- **Error**: "Invalid Straico API key format. Expected format: sk-..."
- **Solution**: Ensure your API key starts with `sk-` and is at least 20 characters long

### Unauthorized Access (401)
- **Error**: "Invalid API key format or unauthorized access"
- **Solution**: Check that your API key is correct and hasn't expired

### Permission Denied (403)
- **Error**: "API key does not have permission to access this resource"
- **Solution**: Verify your Straico account has access to the requested models

### Rate Limiting (429)
- **Error**: "Rate limit exceeded. Please try again later"
- **Solution**: Wait before making additional requests or upgrade your Straico plan

## Usage in Code

### Basic Chat Completion
```typescript
import { aiClient } from '@/lib/ai/client';

const response = await aiClient.chatCompletion(
  'your-straico-provider-id',
  {
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
    model: 'openai/gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.7
  },
  userId,
  projectId
);
```

### Streaming Response
```typescript
for await (const chunk of aiClient.chatCompletionStream(
  'your-straico-provider-id',
  {
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    model: 'anthropic/claude-3-sonnet'
  },
  userId,
  projectId
)) {
  console.log(chunk.delta); // Incremental content
}
```

## Troubleshooting

### Common Issues

1. **"Invalid API key format"**
   - Verify the key is at least 10 characters long
   - Ensure no extra spaces or characters
   - Use the API key exactly as provided by Straico

2. **"Connection failed"**
   - Check your internet connection
   - Verify the Straico API is accessible
   - Try the test endpoint manually

3. **"Model not available"**
   - Some models may not be available in your Straico plan
   - Check the Straico documentation for model availability
   - Try a different model

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=straico npm run dev
```

## Cost Considerations

- Straico pricing may differ from direct provider pricing
- Monitor your usage through the VibeCraft Studio dashboard
- Set up usage quotas to control costs
- Consider using GPT-3.5 Turbo for cost-effective operations

## Support

If you encounter issues with the Straico integration:

1. Check this documentation first
2. Run the comprehensive test to identify the issue
3. Check the VibeCraft Studio error logs
4. Contact Straico support for API-specific issues
5. Open an issue in the VibeCraft Studio repository for integration bugs

## API Reference

### Base URL
```
https://api.straico.com/v0
```

### Authentication
```
Authorization: Bearer sk-your-api-key
```

### Request Format

#### With Specific Model
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "user", "content": "Your prompt here"}
  ],
  "max_tokens": 150,
  "temperature": 0.7,
  "stream": false
}
```

#### With Smart Model Selection
```json
{
  "smart_llm_selector": true,
  "messages": [
    {"role": "user", "content": "Your prompt here"}
  ],
  "max_tokens": 150,
  "temperature": 0.7,
  "stream": false
}
```

For more details, refer to the [Straico API Documentation](https://documenter.getpostman.com/view/5900072/2s9YyzddrR).