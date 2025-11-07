# Phase 1.2: Frontend Setup

## Objective
Initialize React + TypeScript application with Vite, Material-UI dark theme, and development tooling.

**Duration:** 3-4 hours  
**Prerequisites:** Phase 1.1 complete  
**Dependencies:** Node.js 18+

---

## Tasks Overview

1. ✅ Initialize Vite React TypeScript project
2. ✅ Install Material-UI and dependencies
3. ✅ Configure TypeScript strict mode
4. ✅ Set up ESLint and Prettier
5. ✅ Create dark theme configuration
6. ✅ Build base App component with theme provider
7. ✅ Configure Vite for development

---

## Step-by-Step Instructions

### Step 1: Initialize Vite React Project

```bash
cd client
npm create vite@latest . -- --template react-ts
```

**When prompted:**
- Current directory is not empty. Continue? **Y**
- Package name: **client**

### Step 2: Install Core Dependencies

```bash
# Material-UI core
npm install @mui/material @emotion/react @emotion/styled

# Material-UI icons
npm install @mui/icons-material

# Routing
npm install react-router-dom

# State management & data fetching
npm install @tanstack/react-query

# HTTP client
npm install axios

# Microsoft authentication
npm install @azure/msal-browser @azure/msal-react

# Charts
npm install recharts

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns
```

### Step 3: Install Development Dependencies

```bash
npm install -D @types/node eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks
```

---

### Step 4: Configure TypeScript

📁 **File:** `client/tsconfig.json`

🔄 **COMPLETE REWRITE:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "types": ["vite/client", "node"],

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting - Strict Mode */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/pages/*": ["src/pages/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"],
      "@/styles/*": ["src/styles/*"],
      "@/contexts/*": ["src/contexts/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

📁 **File:** `client/tsconfig.node.json`

🔄 **COMPLETE REWRITE:**
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

### Step 5: Configure Vite

📁 **File:** `client/vite.config.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

### Step 6: Configure ESLint

📁 **File:** `client/.eslintrc.cjs`

🔄 **COMPLETE REWRITE:**
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react', 'react-hooks'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

---

### Step 7: Configure Prettier

📁 **File:** `client/.prettierrc`

🔄 **COMPLETE REWRITE:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

📁 **File:** `client/.prettierignore`

🔄 **COMPLETE REWRITE:**
```
dist
node_modules
coverage
.vite
```

---

### Step 8: Create Dark Theme Configuration

📁 **File:** `client/src/styles/theme.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { createTheme, ThemeOptions } from '@mui/material/styles';

// Dark theme color palette
export const darkColors = {
  // Backgrounds
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    elevated: '#2C2C2C',
    paper: '#242424',
  },
  // Text
  text: {
    primary: '#E0E0E0',
    secondary: '#B0B0B0',
    disabled: '#707070',
  },
  // Status colors
  status: {
    notStarted: '#757575',
    inProgress: '#FFA726',
    implemented: '#66BB6A',
    verified: '#42A5F5',
  },
  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  // Borders
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#90CAF9',
      light: '#B3D9F2',
      dark: '#5A8AAE',
      contrastText: '#000000',
    },
    secondary: {
      main: '#CE93D8',
      light: '#E1BEE7',
      dark: '#9C27B0',
      contrastText: '#000000',
    },
    background: {
      default: darkColors.background.primary,
      paper: darkColors.background.paper,
    },
    text: {
      primary: darkColors.text.primary,
      secondary: darkColors.text.secondary,
      disabled: darkColors.text.disabled,
    },
    divider: darkColors.borderLight,
    success: {
      main: darkColors.success,
    },
    warning: {
      main: darkColors.warning,
    },
    error: {
      main: darkColors.error,
    },
    info: {
      main: darkColors.info,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '1rem',
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '0.01071em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${darkColors.text.disabled} ${darkColors.background.primary}`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: darkColors.text.disabled,
            border: `3px solid ${darkColors.background.primary}`,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: darkColors.background.primary,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: darkColors.background.paper,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          backgroundColor: darkColors.background.paper,
        },
        elevation2: {
          backgroundColor: darkColors.background.elevated,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: darkColors.background.elevated,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: darkColors.background.secondary,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);

// Status color helper function
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'not started':
    case 'notstarted':
      return darkColors.status.notStarted;
    case 'in progress':
    case 'inprogress':
      return darkColors.status.inProgress;
    case 'implemented':
      return darkColors.status.implemented;
    case 'verified':
      return darkColors.status.verified;
    default:
      return darkColors.text.secondary;
  }
};
```

---

### Step 9: Create Global Styles

📁 **File:** `client/src/styles/globals.css`

🔄 **COMPLETE REWRITE:**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  width: 100%;
}

body {
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #121212;
  color: #e0e0e0;
  overflow-x: hidden;
}

#root {
  display: flex;
  flex-direction: column;
}

code {
  font-family: 'Courier New', Courier, monospace;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Remove default link styles */
a {
  color: inherit;
  text-decoration: none;
}

/* Smooth transitions */
* {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
```

---

### Step 10: Create Base App Component

📁 **File:** `client/src/App.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import '@/styles/globals.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div>
          <h1>NIST 800-171 Compliance Tracker</h1>
          <p>Phase 1.2 Complete - Frontend Initialized</p>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
```

---

### Step 11: Update Main Entry Point

📁 **File:** `client/src/main.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### Step 12: Update HTML Template

📁 **File:** `client/index.html`

🔄 **COMPLETE REWRITE:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="NIST 800-171 Compliance Tracking Application" />
    <title>NIST 800-171 Compliance Tracker</title>
    <!-- Roboto Font -->
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
    />
    <!-- Material Icons -->
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/icon?family=Material+Icons"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Step 13: Create Environment Variable Template

📁 **File:** `client/.env.example`

🔄 **COMPLETE REWRITE:**
```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Microsoft Authentication
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# Feature Flags
VITE_ENABLE_M365_INTEGRATION=false
```

---

### Step 14: Update Package.json Scripts

📁 **File:** `client/package.json`

🔍 **FIND:** The scripts section

✏️ **REPLACE WITH:**
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
```

---

## Verification Steps

### 1. Check TypeScript Compilation
```bash
cd client
npm run type-check
```

**Expected:** No errors

### 2. Run Development Server
```bash
npm run dev
```

**Expected:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 3. Test in Browser
Open http://localhost:3000

**Expected:**
- Dark background (#121212)
- Title: "NIST 800-171 Compliance Tracker"
- Subtitle: "Phase 1.2 Complete - Frontend Initialized"
- No console errors

### 4. Verify ESLint
```bash
npm run lint
```

**Expected:** No errors (warnings acceptable)

### 5. Verify Prettier
```bash
npm run format
```

**Expected:** Files formatted with no errors

---

## Common Issues & Solutions

### Issue: Cannot find module '@/*'

**Solution:**
Check that `vite.config.ts` has proper path aliases and restart dev server.

### Issue: Vite cannot resolve dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors in node_modules

**Solution:**
Add to `tsconfig.json`:
```json
"skipLibCheck": true
```

---

## Next Steps

✅ **Phase 1.2 Complete!**

Proceed to **[Phase 1.3: Backend Setup](./phase1_03_backend_setup.md)**

---

## Checklist

- [ ] Vite React TypeScript project initialized
- [ ] All dependencies installed (MUI, React Router, React Query, etc.)
- [ ] TypeScript configured with strict mode
- [ ] ESLint and Prettier configured
- [ ] Dark theme created with correct colors
- [ ] Global styles applied
- [ ] App component with theme provider working
- [ ] Vite config with path aliases
- [ ] Environment variable template created
- [ ] Development server runs successfully
- [ ] No TypeScript compilation errors
- [ ] Dark theme displays correctly in browser

---

**Status:** Ready for Phase 1.3  
**Estimated Time:** 3-4 hours  
**Last Updated:** 2025-11-06
