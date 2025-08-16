// Environment configuration utility
export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isStaging: (process.env.NODE_ENV as string) === 'staging',
  isProduction: process.env.NODE_ENV === 'production',

  // Application URLs
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  // AI Providers
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
    straico: {
      apiKey: process.env.STRAICO_API_KEY!,
    },
  },

  // GitHub Integration
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },

  // Security
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // Feature Flags
  features: {
    collaboration: process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true',
    templates: process.env.NEXT_PUBLIC_ENABLE_TEMPLATES === 'true',
    githubIntegration:
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_INTEGRATION === 'true',
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    ai_chat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true',
    knowledge_base: process.env.NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE === 'true',
    code_integration: process.env.NEXT_PUBLIC_ENABLE_CODE_INTEGRATION === 'true',
  },

  // Debug Settings
  debug: {
    enabled: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  },
} as const;

// Validate required environment variables
export function validateConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Environment-specific configurations
export const environmentConfig = {
  development: {
    logLevel: 'debug',
    enableHotReload: true,
    enableSourceMaps: true,
  },
  staging: {
    logLevel: 'info',
    enableHotReload: false,
    enableSourceMaps: true,
  },
  production: {
    logLevel: 'error',
    enableHotReload: false,
    enableSourceMaps: false,
  },
} as const;
