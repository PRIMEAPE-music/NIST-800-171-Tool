import { Configuration, LogLevel } from '@azure/msal-node';

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// MSAL Configuration for Backend (Client Credentials Flow)
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (containsPii) return; // Don't log PII

        switch (loglevel) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'production'
        ? LogLevel.Warning
        : LogLevel.Info,
    },
  },
};

// Token request scopes for different Microsoft services
export const tokenScopes = {
  graph: ['https://graph.microsoft.com/.default'],
  intune: ['https://graph.microsoft.com/.default'],
  purview: ['https://graph.microsoft.com/.default'],
  azureAD: ['https://graph.microsoft.com/.default'],
};

// Graph API endpoint
export const graphEndpoint = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';
