# Phase 1.1: Project Initialization

## Objective
Set up the monorepo structure, initialize package managers, and establish the base project architecture.

**Duration:** 2-3 hours  
**Prerequisites:** Node.js 18+, npm/pnpm installed  
**Dependencies:** None

---

## Tasks Overview

1. ✅ Create root project directory
2. ✅ Initialize root package.json with workspace configuration
3. ✅ Create directory structure
4. ✅ Initialize Git repository
5. ✅ Create .gitignore file
6. ✅ Create basic README.md

---

## Step-by-Step Instructions

### Step 1: Create Project Directory

```bash
# Create main project directory
mkdir nist-800-171-tracker
cd nist-800-171-tracker
```

### Step 2: Initialize Root Package.json

```bash
# Initialize root package.json
npm init -y
```

📁 **File:** `package.json` (root)

🔄 **COMPLETE REWRITE:**
```json
{
  "name": "nist-800-171-tracker",
  "version": "1.0.0",
  "description": "NIST 800-171 Compliance Tracking Application with Microsoft 365 Integration",
  "private": true,
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build:client": "npm run build --workspace=client",
    "build:server": "npm run build --workspace=server",
    "build": "npm run build:server && npm run build:client",
    "clean": "rm -rf node_modules client/node_modules server/node_modules client/dist server/dist",
    "setup": "npm install && npm install --workspace=client && npm install --workspace=server"
  },
  "keywords": [
    "nist-800-171",
    "compliance",
    "security",
    "microsoft-365"
  ],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Install concurrently for running both servers:**
```bash
npm install -D concurrently
```

---

### Step 3: Create Directory Structure

```bash
# Create main directories
mkdir -p client/src
mkdir -p server/src
mkdir -p data
mkdir -p database
mkdir -p uploads
mkdir -p docs
```

**Create .gitkeep files for empty directories:**
```bash
touch database/.gitkeep
touch uploads/.gitkeep
```

---

### Step 4: Initialize Git Repository

```bash
git init
```

📁 **File:** `.gitignore` (root)

🔄 **COMPLETE REWRITE:**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov

# Production builds
build/
dist/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
database/*.db
database/*.db-journal
!database/.gitkeep

# Uploads
uploads/*
!uploads/.gitkeep

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
pnpm-debug.log*

# Editor directories
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~
.DS_Store

# Prisma
server/prisma/migrations/*
!server/prisma/migrations/.gitkeep

# Temporary files
*.tmp
.cache/
.temp/

# OS
Thumbs.db
```

---

### Step 5: Create README.md

📁 **File:** `README.md` (root)

🔄 **COMPLETE REWRITE:**
```markdown
# NIST 800-171 Compliance Tracker

A comprehensive web-based application for tracking, assessing, and documenting NIST 800-171 compliance status across all 110 security requirements.

## Features

- **Control Management**: Track all 110 NIST 800-171 controls
- **Gap Analysis**: Identify compliance gaps with risk scoring
- **POAM Tracking**: Manage remediation plans and milestones
- **Evidence Management**: Centralized document repository
- **Microsoft 365 Integration**: Auto-sync with Intune, Purview, and Azure AD
- **Reporting**: Generate audit-ready compliance reports
- **Dark Theme**: Eye-friendly dark interface

## Tech Stack

### Frontend
- React 18 + TypeScript
- Material-UI v5
- Vite
- React Router v6
- React Query
- Axios

### Backend
- Node.js 18+
- Express + TypeScript
- SQLite3 + Prisma ORM
- Microsoft Graph API
- Passport.js

## Project Structure

```
nist-800-171-tracker/
├── client/          # React frontend application
├── server/          # Express backend API
├── data/            # Static data files (NIST controls JSON)
├── database/        # SQLite database files
└── uploads/         # Evidence file storage
```

## Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Git

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd nist-800-171-tracker
```

### 2. Install dependencies
```bash
npm run setup
```

### 3. Configure environment variables

**Client (.env):**
```bash
cd client
cp .env.example .env
# Edit .env with your configuration
```

**Server (.env):**
```bash
cd server
cp .env.example .env
# Edit .env with your Azure AD configuration
```

### 4. Set up database
```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

## Development

### Run both client and server concurrently:
```bash
npm run dev
```

### Run individually:
```bash
# Terminal 1 - Backend (port 3001)
npm run dev:server

# Terminal 2 - Frontend (port 3000)
npm run dev:client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Microsoft 365 Setup

1. Register an Azure AD application
2. Configure API permissions (see docs/M365_SETUP.md)
3. Add credentials to server/.env
4. Test connection in Settings page

## Database

The application uses SQLite for simplicity and portability. Database file location:
```
database/compliance.db
```

To view the database:
```bash
cd server
npx prisma studio
```

## Building for Production

```bash
npm run build
```

Built files will be in:
- Client: `client/dist/`
- Server: `server/dist/`

## Project Status

**Current Phase:** Phase 1 - Foundation  
**Progress:** In Development

### Completed:
- [x] Project initialization
- [ ] Frontend setup
- [ ] Backend setup
- [ ] Database configuration
- [ ] Control data preparation
- [ ] Database seeding
- [ ] Routing & layout
- [ ] API foundation

## Documentation

- [Project Overview](./docs/PROJECT_OVERVIEW.md)
- [Phase 1 Guide](./docs/PHASE_1_INDEX.md)
- [API Documentation](./docs/API.md) *(Coming Soon)*
- [M365 Integration Guide](./docs/M365_SETUP.md) *(Coming Soon)*

## Security

- Local deployment only
- No data transmission over network
- Environment variables for secrets
- File upload validation
- Input sanitization

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-06
```

---

### Step 6: Create Project Structure Documentation

📁 **File:** `PROJECT_STRUCTURE.md` (root)

🔄 **COMPLETE REWRITE:**
```markdown
# Project Structure

## Root Directory

```
nist-800-171-tracker/
├── client/                  # Frontend React application
├── server/                  # Backend Express API
├── data/                    # Static data files
├── database/                # SQLite database storage
├── uploads/                 # User-uploaded evidence files
├── docs/                    # Project documentation
├── package.json             # Root workspace configuration
├── .gitignore              # Git ignore rules
└── README.md               # Project overview
```

## Client Directory

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   ├── common/        # Generic UI components
│   │   ├── layout/        # Layout components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── controls/      # Control management components
│   │   ├── assessment/    # Assessment components
│   │   ├── poam/          # POAM components
│   │   ├── evidence/      # Evidence management components
│   │   ├── m365/          # M365 integration components
│   │   └── reports/       # Reporting components
│   ├── pages/             # Top-level page components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API client services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── styles/            # Global styles and theme
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Application entry point
│   └── vite-env.d.ts      # Vite type definitions
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Client dependencies

```

## Server Directory

```
server/
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic layer
│   ├── routes/            # API route definitions
│   ├── middleware/        # Express middleware
│   ├── models/            # Prisma schema
│   ├── integrations/      # External API integrations
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── app.ts             # Express app configuration
│   └── index.ts           # Server entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Database seed script
├── tsconfig.json          # TypeScript configuration
└── package.json           # Server dependencies
```

## Data Directory

```
data/
├── nist-800-171-controls.json     # All 110 NIST controls
└── control-m365-mappings.json     # M365 policy mappings
```

## Key Files

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace configuration |
| `client/tsconfig.json` | Frontend TypeScript config |
| `server/tsconfig.json` | Backend TypeScript config |
| `client/vite.config.ts` | Vite build configuration |
| `server/prisma/schema.prisma` | Database schema |
| `.gitignore` | Git ignore rules |
| `.env.example` | Environment variable template |

### Entry Points

| File | Purpose |
|------|---------|
| `client/src/main.tsx` | React application entry |
| `client/src/App.tsx` | Root React component |
| `server/src/index.ts` | Express server entry |
| `server/src/app.ts` | Express app configuration |

## Directory Naming Conventions

- **PascalCase**: React component files (e.g., `ControlCard.tsx`)
- **camelCase**: Utility files, services (e.g., `dateUtils.ts`, `controlService.ts`)
- **kebab-case**: Not used in this project
- **lowercase**: Directories (e.g., `components`, `services`)

## Import Paths

### Absolute Imports (Client)
Configured in `tsconfig.json` and `vite.config.ts`:
```typescript
import { Button } from '@/components/common/Button';
import { useControls } from '@/hooks/useControls';
```

### Relative Imports (Server)
```typescript
import { controlService } from '../services/controlService';
import { validateControl } from '../middleware/validation';
```

## Component Organization

### Component Structure
```typescript
// ComponentName.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

interface ComponentNameProps {
  // Props interface
}

export const ComponentName: React.FC<ComponentNameProps> = (props) => {
  // Component logic
  return (
    // JSX
  );
};
```

### Page Structure
```typescript
// PageName.tsx
import React from 'react';
import { PageComponent } from '@/components/specific/PageComponent';

export const PageName: React.FC = () => {
  // Page logic
  return (
    // JSX with layout
  );
};
```

## File Size Guidelines

- **Components**: < 300 lines
- **Services**: < 200 lines
- **Utilities**: < 150 lines
- **Controllers**: < 200 lines

Split larger files into smaller, focused modules.

---

**Last Updated:** 2025-11-06
```

---

## Verification Steps

After completing all steps, verify:

1. **Directory structure exists:**
   ```bash
   ls -la
   # Should see: client/, server/, data/, database/, uploads/, docs/
   ```

2. **Git initialized:**
   ```bash
   git status
   # Should show initialized repository
   ```

3. **Package.json configured:**
   ```bash
   cat package.json | grep workspaces
   # Should show workspace configuration
   ```

4. **Dependencies installed:**
   ```bash
   npm list --depth=0
   # Should show concurrently
   ```

---

## Expected Output

```
nist-800-171-tracker/
├── client/
│   └── src/
├── server/
│   └── src/
├── data/
├── database/
│   └── .gitkeep
├── uploads/
│   └── .gitkeep
├── docs/
├── .git/
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── PROJECT_STRUCTURE.md
```

---

## Common Issues & Solutions

### Issue: npm workspace errors

**Solution:**
```bash
# Ensure Node.js 18+ installed
node --version

# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Permission denied on directory creation

**Solution:**
```bash
# Run with appropriate permissions
sudo mkdir -p database uploads
sudo chown -R $USER:$USER .
```

---

## Next Steps

✅ **Phase 1.1 Complete!**

Proceed to **[Phase 1.2: Frontend Setup](./phase1_02_frontend_setup.md)**

---

## Checklist

- [ ] Project directory created
- [ ] Root package.json configured with workspaces
- [ ] Directory structure created (client, server, data, database, uploads, docs)
- [ ] Git repository initialized
- [ ] .gitignore file created
- [ ] README.md created
- [ ] PROJECT_STRUCTURE.md created
- [ ] Concurrently installed
- [ ] All verification steps pass

---

**Status:** Ready for Phase 1.2  
**Estimated Time:** 2-3 hours  
**Last Updated:** 2025-11-06
