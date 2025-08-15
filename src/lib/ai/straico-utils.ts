/**
 * Straico API utilities for model fetching and file uploads
 */

export interface StraicoModel {
  id: string;
  name: string;
  description?: string;
  provider: string;
  maxTokens?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface StraicoModelsResponse {
  models: StraicoModel[];
}

export interface StraicoFileUploadResponse {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
}

/**
 * Fetch available models from Straico API
 */
export async function fetchStraicoModels(apiKey: string): Promise<StraicoModel[]> {
  try {
    const response = await fetch('https://api.straico.com/v0/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Straico Models API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data: StraicoModelsResponse = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error fetching Straico models:', error);
    throw error;
  }
}

/**
 * Upload a file to Straico for use in chat completions
 */
export async function uploadFileToStraico(
  apiKey: string,
  file: File
): Promise<StraicoFileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.straico.com/v0/file/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Straico File Upload API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data: StraicoFileUploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading file to Straico:', error);
    throw error;
  }
}

/**
 * Upload a file from buffer to Straico
 */
export async function uploadBufferToStraico(
  apiKey: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<StraicoFileUploadResponse> {
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.append('file', blob, filename);

    const response = await fetch('https://api.straico.com/v0/file/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Straico File Upload API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage += ` ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data: StraicoFileUploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading buffer to Straico:', error);
    throw error;
  }
}

/**
 * Create a chat completion request with file attachments
 */
export interface StraicoMessageWithFiles {
  role: 'user' | 'assistant' | 'system';
  content: string;
  file_ids?: string[];
}

export function createStraicoRequestWithFiles(
  messages: StraicoMessageWithFiles[],
  options: {
    model?: string;
    smartSelector?: boolean;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  } = {}
) {
  const requestBody: any = {
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.file_ids && msg.file_ids.length > 0 && { file_ids: msg.file_ids })
    })),
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: options.stream || false,
  };

  // Include either model OR smart_llm_selector, not both
  if (options.model && options.model !== 'auto' && !options.smartSelector) {
    requestBody.model = options.model;
  } else {
    requestBody.smart_llm_selector = true;
  }

  return requestBody;
}