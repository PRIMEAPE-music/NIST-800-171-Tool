export interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;
  databaseUrl: string;

  // Azure AD / M365
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  graphApiEndpoint: string;

  // Session
  sessionSecret: string;

  // CORS
  clientUrl: string;
}

export function validateEnv(): EnvConfig {
  const requiredVars = [
    'PORT',
    'DATABASE_URL',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'SESSION_SECRET',
    'CLIENT_URL',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL!,
    azureTenantId: process.env.AZURE_TENANT_ID!,
    azureClientId: process.env.AZURE_CLIENT_ID!,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
    graphApiEndpoint: process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0',
    sessionSecret: process.env.SESSION_SECRET!,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  };
}
