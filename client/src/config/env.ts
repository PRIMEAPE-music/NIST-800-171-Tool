/**
 * Client-side environment configuration
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

interface ClientConfig {
  api: {
    baseUrl: string;
  };
  azure: {
    clientId: string;
    tenantId: string;
    redirectUri: string;
  };
  features: {
    m365Integration: boolean;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
}

function getEnvVar(key: keyof ImportMetaEnv, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const clientConfig: ClientConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_URL', 'http://localhost:3001/api'),
  },
  azure: {
    clientId: getEnvVar('VITE_AZURE_CLIENT_ID', ''),
    tenantId: getEnvVar('VITE_AZURE_TENANT_ID', ''),
    redirectUri: getEnvVar('VITE_AZURE_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
  },
  features: {
    m365Integration: getEnvVar('VITE_ENABLE_M365_INTEGRATION', 'false') === 'true',
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', 'NIST 800-171 Compliance Tracker'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    environment: getEnvVar('VITE_ENV', 'development'),
  },
};

// Validate configuration in development
if (import.meta.env.DEV) {
  console.log('📋 Client Configuration:', {
    apiUrl: clientConfig.api.baseUrl,
    azureConfigured: !!clientConfig.azure.clientId,
    m365Enabled: clientConfig.features.m365Integration,
    environment: clientConfig.app.environment,
  });
}
