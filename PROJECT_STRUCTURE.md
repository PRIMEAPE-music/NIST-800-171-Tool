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
