# Phase 6 Part 2: Backend Authentication Setup

## 🎯 Objective
Implement Microsoft Authentication Library (MSAL) on the backend for app-only access to Microsoft Graph API using client credentials flow.

## 📋 Prerequisites
- Part 1 completed (database schema updated)
- Azure AD app registration created (or ready to create)
- Client ID, Tenant ID, and Client Secret available
- Environment variables configured

## 🔑 Azure AD App Registration

Before coding, complete this setup in Azure Portal:

### Step-by-Step Azure AD Setup

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to "Azure Active Directory" or "Microsoft Entra ID"

2. **Create App Registration**
   - Click "App registrations" → "New registration"
   - Name: `NIST 800-171 Compliance Tracker`
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Leave blank for now (we'll add later for frontend)
   - Click "Register"

3. **Note Application Details**
   - Copy **Application (client) ID**
   - Copy **Directory (tenant) ID**

4. **Create Client Secret**
   - Go to "Certificates & secrets" → "Client secrets"
   - Click "New client secret"
   - Description: `Compliance Tracker Backend`
   - Expires: Choose 12-24 months
   - Click "Add"
   - **IMMEDIATELY COPY THE SECRET VALUE** (you won't see it again)

5. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission" → "Microsoft Graph" → "Application permissions"
   - Add these permissions:
     - `DeviceManagementConfiguration.Read.All`
     - `DeviceManagementManagedDevices.Read.All`
     - `InformationProtectionPolicy.Read.All`
     - `SecurityEvents.Read.All`
     - `Directory.Read.All`
     - `Policy.Read.All`
   - Click "Grant admin consent for [Your Organization]"
   - Verify all permissions show green checkmarks

## 📦 Install Dependencies

```bash
cd server

npm install @azure/msal-node @microsoft/microsoft-graph-client isomorphic-fetch

# Type definitions
npm install -D @types/isomorphic-fetch
```

## 🗂️ Files to Create/Modify

### 1. Environment Variables

**📁 File**: `server/.env`

➕ **ADD** these variables:

```env
# Microsoft 365 / Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_AUTHORITY=https://login.microsoftonline.com/${AZURE_TENANT_ID}
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0

# Token Cache (optional)
TOKEN_CACHE_ENABLED=true
```

### 2. MSAL Configuration

**📁 File**: `server/src/config/msal.config.ts`

🔄 **COMPLETE FILE**:

```typescript
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
```

### 3. MSAL Authentication Service

**📁 File**: `server/src/services/auth.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import { msalConfig, tokenScopes } from '../config/msal.config';

class AuthService {
  private msalClient: ConfidentialClientApplication;
  private tokenCache: Map<string, { token: string; expiresOn: Date }>;

  constructor() {
    this.msalClient = new ConfidentialClientApplication(msalConfig);
    this.tokenCache = new Map();
  }

  /**
   * Acquire access token using client credentials flow
   * This is for app-only access (no user context)
   */
  async acquireToken(scopes: string[] = tokenScopes.graph): Promise<string> {
    try {
      // Check cache first
      const cacheKey = scopes.join(',');
      const cached = this.tokenCache.get(cacheKey);
      
      if (cached && cached.expiresOn > new Date()) {
        console.log('Using cached token');
        return cached.token;
      }

      // Acquire new token
      const result: AuthenticationResult | null = 
        await this.msalClient.acquireTokenByClientCredential({
          scopes: scopes,
          skipCache: false,
        });

      if (!result || !result.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Cache the token
      if (result.expiresOn) {
        this.tokenCache.set(cacheKey, {
          token: result.accessToken,
          expiresOn: result.expiresOn,
        });
      }

      console.log('Acquired new access token');
      return result.accessToken;
    } catch (error) {
      console.error('Error acquiring token:', error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Validate if we can successfully authenticate
   */
  async validateConnection(): Promise<boolean> {
    try {
      const token = await this.acquireToken();
      return !!token;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Clear token cache (useful for logout or refresh)
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
    console.log('Token cache cleared');
  }

  /**
   * Get current cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.tokenCache.size;
  }
}

// Export singleton instance
export const authService = new AuthService();
```

### 4. Microsoft Graph Client Service

**📁 File**: `server/src/services/graphClient.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { Client, ClientOptions } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch'; // Required for Graph client
import { authService } from './auth.service';
import { graphEndpoint } from '../config/msal.config';

class GraphClientService {
  private client: Client | null = null;

  /**
   * Get authenticated Graph client instance
   */
  async getClient(): Promise<Client> {
    if (!this.client) {
      const token = await authService.acquireToken();

      const clientOptions: ClientOptions = {
        authProvider: (done) => {
          done(null, token);
        },
        defaultVersion: 'v1.0',
      };

      this.client = Client.init(clientOptions);
    }

    return this.client;
  }

  /**
   * Reset client (forces new token acquisition on next request)
   */
  resetClient(): void {
    this.client = null;
  }

  /**
   * Make a GET request to Graph API
   */
  async get<T>(endpoint: string): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.api(endpoint).get();
      return response as T;
    } catch (error) {
      console.error(`Graph API GET error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to Graph API
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.api(endpoint).post(data);
      return response as T;
    } catch (error) {
      console.error(`Graph API POST error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Graph API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get organization info as a simple test
      await this.get('/organization');
      return true;
    } catch (error) {
      console.error('Graph API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const graphClientService = new GraphClientService();
```

### 5. Authentication Routes

**📁 File**: `server/src/routes/auth.routes.ts`

🔄 **COMPLETE FILE**:

```typescript
import { Router } from 'express';
import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

const router = Router();

/**
 * GET /api/auth/status
 * Check M365 authentication status
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = await authService.validateConnection();
    
    res.json({
      connected: isConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: 'Failed to validate connection',
    });
  }
});

/**
 * GET /api/auth/test-graph
 * Test Graph API connection
 */
router.get('/test-graph', async (req, res) => {
  try {
    const isConnected = await graphClientService.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'Successfully connected to Microsoft Graph API',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Failed to connect to Microsoft Graph API',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing Graph API connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Force token refresh
 */
router.post('/refresh-token', async (req, res) => {
  try {
    authService.clearTokenCache();
    graphClientService.resetClient();
    
    // Acquire new token to validate
    const isConnected = await authService.validateConnection();
    
    res.json({
      success: isConnected,
      message: 'Token cache cleared and refreshed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

### 6. Update Main Routes Index

**📁 File**: `server/src/routes/index.ts`

🔍 **FIND**:
```typescript
import express from 'express';
const router = express.Router();

// Import other route modules here
// import controlRoutes from './control.routes';

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
```

✏️ **REPLACE WITH**:
```typescript
import express from 'express';
import authRoutes from './auth.routes';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
```

### 7. Environment Validation Utility

**📁 File**: `server/src/utils/env.validation.ts`

🔄 **COMPLETE FILE**:

```typescript
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
```

### 8. Update Server Entry Point

**📁 File**: `server/src/index.ts`

🔍 **FIND** (likely at the top of the file):
```typescript
import express from 'express';
import cors from 'cors';
// ... other imports

const app = express();
```

✏️ **ADD AFTER** the imports:
```typescript
import { validateEnv } from './utils/env.validation';

// Validate environment variables on startup
try {
  validateEnv();
  console.log('✅ Environment variables validated');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}
```

## 🧪 Testing

### 1. Test Environment Setup

Create a test script:

**📁 File**: `server/src/scripts/test-auth.ts`

🔄 **COMPLETE FILE**:

```typescript
import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

async function testAuthentication() {
  console.log('🔐 Testing M365 Authentication...\n');

  try {
    // Test 1: Validate connection
    console.log('Test 1: Validating connection...');
    const isConnected = await authService.validateConnection();
    console.log(`Result: ${isConnected ? '✅ Connected' : '❌ Failed'}\n`);

    if (!isConnected) {
      throw new Error('Connection validation failed');
    }

    // Test 2: Acquire token
    console.log('Test 2: Acquiring access token...');
    const token = await authService.acquireToken();
    console.log(`Result: ✅ Token acquired (length: ${token.length})\n`);

    // Test 3: Test Graph API
    console.log('Test 3: Testing Graph API connection...');
    const graphConnected = await graphClientService.testConnection();
    console.log(`Result: ${graphConnected ? '✅ Graph API accessible' : '❌ Graph API failed'}\n`);

    // Test 4: Get organization info
    console.log('Test 4: Fetching organization info...');
    const orgInfo = await graphClientService.get('/organization');
    console.log('Result: ✅ Organization data retrieved');
    console.log('Organization:', JSON.stringify(orgInfo, null, 2));

    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testAuthentication();
```

### 2. Add Test Script to package.json

**📁 File**: `server/package.json`

🔍 **FIND**:
```json
"scripts": {
  "dev": "ts-node-dev src/index.ts",
  "build": "tsc"
}
```

✏️ **REPLACE WITH**:
```json
"scripts": {
  "dev": "ts-node-dev src/index.ts",
  "build": "tsc",
  "test:auth": "ts-node src/scripts/test-auth.ts"
}
```

### 3. Run Tests

```bash
# Start server (in one terminal)
npm run dev

# Test auth endpoints (in another terminal)
curl http://localhost:3001/api/auth/status
curl http://localhost:3001/api/auth/test-graph

# Run test script
npm run test:auth
```

## ✅ Completion Checklist

- [ ] Azure AD app registration created
- [ ] Client ID, Tenant ID, and Secret obtained
- [ ] API permissions granted and consented
- [ ] Environment variables configured in .env
- [ ] MSAL dependencies installed
- [ ] msal.config.ts created
- [ ] auth.service.ts created
- [ ] graphClient.service.ts created
- [ ] auth.routes.ts created
- [ ] Routes registered in index.ts
- [ ] env.validation.ts created
- [ ] Server entry point updated
- [ ] Test script created
- [ ] All tests pass successfully
- [ ] `/api/auth/status` returns connected: true
- [ ] `/api/auth/test-graph` succeeds

## 🔒 Security Notes

1. **Never commit secrets**: Ensure `.env` is in `.gitignore`
2. **Rotate secrets regularly**: Set calendar reminders
3. **Use environment-specific apps**: Separate apps for dev/staging/prod
4. **Monitor token usage**: Check Azure AD sign-in logs
5. **Least privilege**: Only request permissions you need

## 🚀 Next Steps

After completing Part 2, proceed to:
**Part 3: Microsoft Graph API Integration** (`PHASE_6_PART_3_GRAPH_API.md`)

This will build on the authentication foundation to fetch actual policy data from Intune, Purview, and Azure AD.

---

**Estimated Time**: 2-3 hours
**Complexity**: Medium
**Dependencies**: Part 1 (Database Schema)
