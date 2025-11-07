# Phase 1.3: Backend Setup

## Objective
Initialize Express + TypeScript server with base middleware, error handling, and development configuration.

**Duration:** 3-4 hours  
**Prerequisites:** Phase 1.1 complete  
**Dependencies:** Node.js 18+

---

## Tasks Overview

1. ✅ Initialize Node.js project with TypeScript
2. ✅ Install Express and dependencies
3. ✅ Configure TypeScript for backend
4. ✅ Create Express app with middleware
5. ✅ Set up error handling
6. ✅ Configure development environment
7. ✅ Create health check endpoint

---

## Step-by-Step Instructions

### Step 1: Initialize Server Project

```bash
cd server
npm init -y
```

### Step 2: Install Core Dependencies

```bash
# Express and middleware
npm install express cors cookie-parser helmet morgan

# Microsoft Graph and authentication
npm install @azure/msal-node @microsoft/microsoft-graph-client passport passport-azure-ad

# Database and ORM
npm install @prisma/client

# Validation and utilities
npm install zod dotenv winston

# File upload
npm install multer
```

### Step 3: Install Development Dependencies

```bash
npm install -D typescript @types/node @types/express @types/cors @types/cookie-parser @types/morgan @types/multer ts-node-dev prisma
```

---

### Step 4: Initialize TypeScript

```bash
npx tsc --init
```

📁 **File:** `server/tsconfig.json`

🔄 **COMPLETE REWRITE:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/config/*": ["src/config/*"],
      "@/controllers/*": ["src/controllers/*"],
      "@/services/*": ["src/services/*"],
      "@/routes/*": ["src/routes/*"],
      "@/middleware/*": ["src/middleware/*"],
      "@/models/*": ["src/models/*"],
      "@/integrations/*": ["src/integrations/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

---

### Step 5: Configure Package.json Scripts

📁 **File:** `server/package.json`

🔍 **FIND:** The scripts section

✏️ **REPLACE WITH:**
```json
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node src/seed.ts",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "type-check": "tsc --noEmit"
  },
```

---

### Step 6: Create Environment Configuration

📁 **File:** `server/.env.example`

🔄 **COMPLETE REWRITE:**
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:../database/compliance.db"

# Microsoft 365 / Azure AD
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# Microsoft Graph API
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=../uploads

# Session & Security
SESSION_SECRET=your-random-session-secret-here-change-in-production
COOKIE_SECRET=your-random-cookie-secret-here-change-in-production

# CORS
CLIENT_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

---

### Step 7: Create Configuration Module

📁 **File:** `server/src/config/index.ts`

🔄 **COMPLETE REWRITE:**
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

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'COOKIE_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
```

---

### Step 8: Create Logger Utility

📁 **File:** `server/src/utils/logger.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import winston from 'winston';
import { config } from '@/config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Create stream for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
```

---

### Step 9: Create Error Handling Middleware

📁 **File:** `server/src/middleware/errorHandler.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Check if error is an operational error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn(`${statusCode} - ${message}`, {
      path: req.path,
      method: req.method,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
  });
};

// Catch 404 and forward to error handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection:', reason);
    throw reason;
  });
};

// Handle uncaught exceptions
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};
```

---

### Step 10: Create Express Application

📁 **File:** `server/src/app.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from '@/config';
import { logger, loggerStream } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(config.cookie.secret));

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev', { stream: loggerStream }));
} else {
  app.use(morgan('combined', { stream: loggerStream }));
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes will be added here
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'NIST 800-171 Compliance Tracker API',
    version: '1.0.0',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
```

---

### Step 11: Create Server Entry Point

📁 **File:** `server/src/index.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import app from './app';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { handleUncaughtException, handleUnhandledRejection } from '@/middleware/errorHandler';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);
  logger.info(`📊 Health check: http://localhost:${config.port}/health`);
  logger.info(`🔌 API endpoint: http://localhost:${config.port}/api`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('Server closed. Process terminating...');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

### Step 12: Create TypeScript Path Resolution

📁 **File:** `server/src/paths.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { register } from 'module';
import { pathToFileURL } from 'url';

// This file enables TypeScript path aliases at runtime
// For ts-node-dev, add to tsconfig.json:
// "ts-node": { "require": ["tsconfig-paths/register"] }
```

Install tsconfig-paths:
```bash
npm install -D tsconfig-paths
```

Update `tsconfig.json` to include:
```json
{
  "ts-node": {
    "require": ["tsconfig-paths/register"]
  }
}
```

---

## Verification Steps

### 1. Check TypeScript Compilation
```bash
cd server
npm run type-check
```

**Expected:** No errors

### 2. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
[INFO] 🚀 Server running in development mode on port 3001
[INFO] 📊 Health check: http://localhost:3001/health
[INFO] 🔌 API endpoint: http://localhost:3001/api
```

### 3. Test Health Check Endpoint
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-06T...",
  "environment": "development"
}
```

### 4. Test API Endpoint
```bash
curl http://localhost:3001/api
```

**Expected Response:**
```json
{
  "success": true,
  "message": "NIST 800-171 Compliance Tracker API",
  "version": "1.0.0"
}
```

### 5. Test Error Handling
```bash
curl http://localhost:3001/nonexistent-route
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "message": "Route not found: /nonexistent-route"
  }
}
```

---

## Common Issues & Solutions

### Issue: Module path aliases not working

**Solution:**
```bash
npm install -D tsconfig-paths
```

Add to `package.json`:
```json
"dev": "ts-node-dev -r tsconfig-paths/register --respawn --transpile-only src/index.ts"
```

### Issue: Port 3001 already in use

**Solution:**
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env file
echo "PORT=3002" >> .env
```

### Issue: CORS errors when testing with frontend

**Solution:**
Verify `CLIENT_URL` in `.env` matches frontend URL exactly.

---

## Next Steps

✅ **Phase 1.3 Complete!**

Proceed to **[Phase 1.4: Database Setup](./phase1_04_database_setup.md)**

---

## Checklist

- [ ] Node.js project initialized in server directory
- [ ] All dependencies installed (Express, TypeScript, etc.)
- [ ] TypeScript configured with strict mode
- [ ] Configuration module created
- [ ] Logger utility created
- [ ] Error handling middleware created
- [ ] Express app with CORS, helmet, body parsing
- [ ] Health check endpoint working
- [ ] Development server runs successfully
- [ ] No TypeScript compilation errors
- [ ] Server responds to health check
- [ ] Error handling works correctly

---

**Status:** Ready for Phase 1.4  
**Estimated Time:** 3-4 hours  
**Last Updated:** 2025-11-06
