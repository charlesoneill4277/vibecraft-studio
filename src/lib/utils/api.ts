// API utilities

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.code
    );
  }

  const data = await response.json();

  if (data.success === false) {
    throw new APIError(data.error || data.message || 'API request failed');
  }

  return data.data || data;
}

export function createAPIResponse<T>(
  data?: T,
  message?: string,
  success: boolean = true
): APIResponse<T> {
  return {
    data,
    message,
    success,
  };
}

export function createAPIError(error: string, message?: string): APIResponse {
  return {
    error,
    message,
    success: false,
  };
}

export async function fetchAPI<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  return handleAPIResponse<T>(response);
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function getAPIUrl(path: string, params?: Record<string, any>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const queryString = params ? buildQueryString(params) : '';

  return `${baseUrl}${cleanPath}${queryString}`;
}
