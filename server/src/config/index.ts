import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  azure: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  graphApi: {
    endpoint: string;
  };
  fileUpload: {
    maxFileSize: number;
    uploadPath: string;
  };
  session: {
    secret: string;
  };
  cookie: {
    secret: string;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:../database/compliance.db',
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },
  graphApi: {
    endpoint: process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0',
  },
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    uploadPath: path.resolve(process.cwd(), process.env.UPLOAD_PATH || '../uploads'),
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me',
  },
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
];

// Add Azure AD validation only if attempting to use M365 integration
const azureEnvVars = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
const hasAnyAzureConfig = azureEnvVars.some(envVar => process.env[envVar] && process.env[envVar] !== 'your-tenant-id-here' && process.env[envVar] !== 'your-client-id-here' && process.env[envVar] !== 'your-client-secret-here');

if (hasAnyAzureConfig) {
  // If any Azure config is provided, all must be provided
  for (const envVar of azureEnvVars) {
    if (!process.env[envVar] || process.env[envVar]?.startsWith('your-')) {
      console.warn(`⚠️  Warning: ${envVar} is not configured. M365 integration will not work.`);
    }
  }
}

// Validate critical env vars
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
