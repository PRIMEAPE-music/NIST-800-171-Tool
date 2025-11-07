# Phase 1.9: Environment Configuration

## Objective
Set up comprehensive environment variable management for both client and server with type-safe access and proper documentation.

**Duration:** 1-2 hours  
**Prerequisites:** Phase 1.3 and 1.4 complete  
**Dependencies:** dotenv package

---

## Tasks Overview

1. ✅ Create .env.example files for client and server
2. ✅ Document all environment variables
3. ✅ Implement type-safe environment variable access
4. ✅ Add validation for required variables
5. ✅ Update .gitignore to protect secrets

---

## Step-by-Step Instructions

### Step 1: Create Client Environment Template

📁 **File:** `client/.env.example`

🔄 **COMPLETE REWRITE:**
```env
# =============================================================================
# Client Environment Variables
# =============================================================================
# Copy this file to .env and fill in your values
# NEVER commit .env file to version control
# =============================================================================

# API Configuration
# URL of the backend API server
VITE_API_URL=http://localhost:3001/api

# Microsoft Azure AD Authentication
# Get these values from Azure Portal > App registrations
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# Feature Flags
# Enable/disable Microsoft 365 integration
VITE_ENABLE_M365_INTEGRATION=false

# Application Settings
# Application name displayed in UI
VITE_APP_NAME=NIST 800-171 Compliance Tracker
# Application version
VITE_APP_VERSION=1.0.0
# Environment (development, staging, production)
VITE_ENV=development
```

---

### Step 2: Create Server Environment Template

📁 **File:** `server/.env.example`

🔄 **COMPLETE REWRITE:**
```env
# =============================================================================
# Server Environment Variables
# =============================================================================
# Copy this file to .env and fill in your values
# NEVER commit .env file to version control
# =============================================================================

# Server Configuration
# Port for the Express server to listen on
PORT=3001
# Node environment (development, production, test)
NODE_ENV=development

# Database Configuration
# SQLite database file path (relative to server directory)
DATABASE_URL="file:../database/compliance.db"

# Microsoft 365 / Azure AD Configuration
# =============================================================================
# To obtain these values:
# 1. Go to portal.azure.com
# 2. Navigate to Azure Active Directory > App registrations
# 3. Create or select your app registration
# 4. Copy the values from the Overview page
# =============================================================================

# Azure AD Tenant ID (Directory ID)
AZURE_TENANT_ID=your-tenant-id-here

# Azure AD Application (Client) ID
AZURE_CLIENT_ID=your-client-id-here

# Azure AD Client Secret
# WARNING: Keep this secret secure! Never commit to version control
AZURE_CLIENT_SECRET=your-client-secret-here

# OAuth Redirect URI (must match Azure AD configuration)
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# Microsoft Graph API Configuration
# Base endpoint for Microsoft Graph API
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0

# File Upload Configuration
# Maximum file size in bytes (default: 10MB)
MAX_FILE_SIZE=10485760
# Directory for uploaded files (relative to server directory)
UPLOAD_PATH=../uploads

# Session & Security Configuration
# =============================================================================
# IMPORTANT: Generate strong, random secrets for production!
# Example: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# =============================================================================

# Session secret for Express sessions
SESSION_SECRET=change-this-to-a-random-string-in-production

# Cookie secret for signed cookies
COOKIE_SECRET=change-this-to-a-random-string-in-production

# CORS Configuration
# Frontend URL for CORS (must match client URL exactly)
CLIENT_URL=http://localhost:3000

# Logging Configuration
# Log level: error, warn, info, http, verbose, debug, silly
LOG_LEVEL=debug

# Optional: External Services
# Add configuration for any external services here
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password
```

---

### Step 3: Create Client Environment Types

📁 **File:** `client/src/types/env.d.ts`

🔄 **COMPLETE REWRITE:**
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  
  // Microsoft Azure AD
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_TENANT_ID: string;
  readonly VITE_AZURE_REDIRECT_URI: string;
  
  // Feature Flags
  readonly VITE_ENABLE_M365_INTEGRATION: string;
  
  // Application Settings
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

### Step 4: Create Client Environment Config Module

📁 **File:** `client/src/config/env.ts`

🔄 **COMPLETE REWRITE:**
```typescript
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
```

---

### Step 5: Update Server Config Module

📁 **File:** `server/src/config/index.ts`

🔍 **FIND:** The entire file content

✏️ **REPLACE WITH:**
```typescript
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

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarOptional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: Config = {
  port: parseInt(getEnvVarOptional('PORT', '3001'), 10),
  nodeEnv: getEnvVarOptional('NODE_ENV', 'development'),
  databaseUrl: getEnvVar('DATABASE_URL', 'file:../database/compliance.db'),
  
  azure: {
    tenantId: getEnvVarOptional('AZURE_TENANT_ID', ''),
    clientId: getEnvVarOptional('AZURE_CLIENT_ID', ''),
    clientSecret: getEnvVarOptional('AZURE_CLIENT_SECRET', ''),
    redirectUri: getEnvVarOptional('AZURE_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
  },
  
  graphApi: {
    endpoint: getEnvVarOptional('GRAPH_API_ENDPOINT', 'https://graph.microsoft.com/v1.0'),
  },
  
  fileUpload: {
    maxFileSize: parseInt(getEnvVarOptional('MAX_FILE_SIZE', '10485760'), 10),
    uploadPath: path.resolve(process.cwd(), getEnvVarOptional('UPLOAD_PATH', '../uploads')),
  },
  
  session: {
    secret: getEnvVar('SESSION_SECRET', 'dev-session-secret-change-me'),
  },
  
  cookie: {
    secret: getEnvVar('COOKIE_SECRET', 'dev-cookie-secret-change-me'),
  },
  
  cors: {
    origin: getEnvVarOptional('CLIENT_URL', 'http://localhost:3000'),
  },
  
  logging: {
    level: getEnvVarOptional('LOG_LEVEL', 'info'),
  },
};

// Validate required production environment variables
if (config.nodeEnv === 'production') {
  const requiredProdVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'COOKIE_SECRET',
  ];

  const missing = requiredProdVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  // Warn about default secrets
  if (config.session.secret.includes('dev-') || config.cookie.secret.includes('dev-')) {
    console.error('⚠️  WARNING: Using default secrets in production! Generate secure secrets immediately!');
  }
}

// Log configuration summary in development
if (config.nodeEnv === 'development') {
  console.log('📋 Server Configuration:', {
    port: config.port,
    environment: config.nodeEnv,
    databaseUrl: config.databaseUrl,
    corsOrigin: config.cors.origin,
    azureConfigured: !!config.azure.clientId,
  });
}
```

---

### Step 6: Create Environment Setup Documentation

📁 **File:** `docs/ENVIRONMENT_SETUP.md`

🔄 **COMPLETE REWRITE:**
```markdown
# Environment Configuration Guide

## Quick Start

### 1. Client Environment Setup

```bash
cd client
cp .env.example .env
```

Edit `client/.env` and configure:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)

### 2. Server Environment Setup

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and configure:
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - Database path (default: file:../database/compliance.db)
- `SESSION_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `COOKIE_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Detailed Configuration

### Client Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | http://localhost:3001/api | Backend API endpoint |
| `VITE_AZURE_CLIENT_ID` | For M365 | - | Azure AD Application ID |
| `VITE_AZURE_TENANT_ID` | For M365 | - | Azure AD Tenant ID |
| `VITE_AZURE_REDIRECT_URI` | For M365 | http://localhost:3000/auth/callback | OAuth redirect |
| `VITE_ENABLE_M365_INTEGRATION` | No | false | Enable M365 features |

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes | file:../database/compliance.db | Database connection |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `COOKIE_SECRET` | Yes | - | Cookie signing key |
| `CLIENT_URL` | Yes | http://localhost:3000 | Frontend URL for CORS |

---

## Microsoft 365 Setup (Optional)

See [M365_SETUP.md](./M365_SETUP.md) for detailed Azure AD configuration.

Quick steps:
1. Create Azure AD App Registration
2. Configure API permissions
3. Generate client secret
4. Add credentials to `.env` files

---

## Security Best Practices

1. **Never commit .env files** - They contain secrets
2. **Generate strong secrets** - Use crypto.randomBytes()
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets** - For each environment
5. **Restrict database access** - File permissions on SQLite

---

## Troubleshooting

### "Missing required environment variable"
- Check `.env` file exists
- Verify variable names match exactly
- Restart dev server after changes

### CORS errors
- Ensure `CLIENT_URL` matches frontend URL exactly
- Check for trailing slashes
- Verify ports match

### M365 integration not working
- Verify all Azure AD variables set
- Check `VITE_ENABLE_M365_INTEGRATION=true`
- Validate Azure AD app permissions

---

**Last Updated:** 2025-11-06
```

---

### Step 7: Update .gitignore (if not already)

Ensure `.env` files are ignored:

```bash
# Verify .env is in .gitignore
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

---

## Verification Steps

### 1. Create Environment Files

```bash
# Client
cd client
cp .env.example .env

# Server
cd server
cp .env.example .env
```

### 2. Verify Client Config Loads

```bash
cd client
npm run dev
```

Check console for configuration log.

### 3. Verify Server Config Loads

```bash
cd server
npm run dev
```

Check console for configuration summary.

### 4. Test Environment Variable Access

Create test file:

📁 **File:** `server/src/test-env.ts`

```typescript
import { config } from './config';

console.log('Testing environment configuration...\n');
console.log('Port:', config.port);
console.log('Environment:', config.nodeEnv);
console.log('Database URL:', config.databaseUrl);
console.log('CORS Origin:', config.cors.origin);
console.log('\n✅ Environment loaded successfully');
```

Run:
```bash
npx ts-node src/test-env.ts
```

---

## Next Steps

✅ **Phase 1.9 Complete!**

Proceed to **[Phase 1.10: Integration & Testing](./phase1_10_integration_testing.md)**

---

## Checklist

- [ ] Client .env.example created
- [ ] Server .env.example created
- [ ] Client environment types defined
- [ ] Client config module created
- [ ] Server config module updated
- [ ] Environment documentation created
- [ ] .gitignore includes .env
- [ ] .env files created from examples
- [ ] Environment variables load successfully
- [ ] Type-safe access working
- [ ] Validation for required variables working

---

**Status:** Ready for Phase 1.10  
**Estimated Time:** 1-2 hours  
**Last Updated:** 2025-11-06
