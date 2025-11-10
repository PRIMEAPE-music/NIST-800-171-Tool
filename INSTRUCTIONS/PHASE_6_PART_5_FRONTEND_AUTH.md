# Phase 6 Part 5: Frontend MSAL & Auth Flow

## 🎯 Objective
Implement Microsoft Authentication Library (MSAL) in the React frontend for user authentication and access to protected M365 resources.

## 📋 Prerequisites
- Part 1-4 completed (backend fully functional)
- Azure AD app registration completed in Part 2
- Need to add SPA redirect URI to Azure AD app

## 🔑 Update Azure AD App Registration

Before coding, update your Azure AD app:

1. **Add Redirect URI**
   - Go to Azure Portal → App registrations → Your app
   - Click "Authentication"
   - Click "Add a platform" → "Single-page application"
   - Add redirect URI: `http://localhost:3000/auth/callback`
   - Also add: `http://localhost:3000` (for silent token refresh)
   - Click "Configure"

2. **Verify API Permissions**
   - Go to "API permissions"
   - Ensure these **Delegated** permissions are added (in addition to Application permissions):
     - `User.Read`
     - `DeviceManagementConfiguration.Read.All`
     - `DeviceManagementManagedDevices.Read.All`
     - `InformationProtectionPolicy.Read.All`
     - `SecurityEvents.Read.All`
     - `Directory.Read.All`
     - `Policy.Read.All`
   - Grant admin consent

## 📦 Install Dependencies

```bash
cd client

npm install @azure/msal-browser @azure/msal-react

# Already installed from earlier phases, but verify:
npm install react-router-dom @tanstack/react-query axios
```

## 🗂️ Files to Create/Modify

### 1. MSAL Configuration

**📁 File**: `client/src/config/msal.config.ts`

🔄 **COMPLETE FILE**:

```typescript
import { Configuration, PopupRequest } from '@azure/msal-browser';

// MSAL configuration for React (Interactive/Delegated auth)
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },
  cache: {
    cacheLocation: 'sessionStorage', // or 'localStorage'
    storeAuthStateInCookie: false, // Set to true for IE11/Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case 0: // Error
            console.error(message);
            break;
          case 1: // Warning
            console.warn(message);
            break;
          case 2: // Info
            console.info(message);
            break;
          case 3: // Verbose
            console.debug(message);
            break;
        }
      },
    },
  },
};

// Scopes for login request
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'],
};

// Scopes for Graph API calls
export const graphScopes = {
  user: ['User.Read'],
  deviceManagement: [
    'DeviceManagementConfiguration.Read.All',
    'DeviceManagementManagedDevices.Read.All',
  ],
  informationProtection: ['InformationProtectionPolicy.Read.All'],
  security: ['SecurityEvents.Read.All'],
  directory: ['Directory.Read.All', 'Policy.Read.All'],
};

// All scopes combined for initial consent
export const allScopes: PopupRequest = {
  scopes: [
    'User.Read',
    'DeviceManagementConfiguration.Read.All',
    'DeviceManagementManagedDevices.Read.All',
    'InformationProtectionPolicy.Read.All',
    'SecurityEvents.Read.All',
    'Directory.Read.All',
    'Policy.Read.All',
  ],
};
```

### 2. Environment Variables

**📁 File**: `client/.env`

🔄 **COMPLETE FILE**:

```env
# Vite requires VITE_ prefix for environment variables
VITE_API_URL=http://localhost:3001/api
VITE_AZURE_TENANT_ID=your-tenant-id-here
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 3. Auth Context

**📁 File**: `client/src/contexts/AuthContext.tsx`

🔄 **COMPLETE FILE**:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { AccountInfo } from '@azure/msal-browser';
import { loginRequest } from '../config/msal.config';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set initial user if already logged in
    if (accounts.length > 0) {
      setUser(accounts[0]);
    }
    setIsLoading(false);
  }, [accounts]);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use popup for login (can also use redirect)
      const response = await instance.loginPopup(loginRequest);
      setUser(response.account);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: '/',
      });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated: accounts.length > 0,
    user,
    login,
    logout,
    isLoading: isLoading || inProgress !== 'none',
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 4. Update Main App Entry

**📁 File**: `client/src/main.tsx`

🔍 **FIND**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

✏️ **REPLACE WITH**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './config/msal.config';
import App from './App';
import './index.css';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL (required for proper setup)
await msalInstance.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>,
);
```

### 5. Update App.tsx with Auth Provider

**📁 File**: `client/src/App.tsx`

🔍 **FIND** (likely near the top):
```typescript
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* Your app content */}
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

✏️ **REPLACE WITH**:
```typescript
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { theme } from './styles/theme';

// Create Query Client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {/* Your app content */}
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
```

### 6. Login Page Component

**📁 File**: `client/src/pages/Login.tsx`

🔄 **COMPLETE FILE**:

```typescript
import React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { MicrosoftIcon } from '@mui/icons-material'; // or use a custom icon
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" gutterBottom>
            NIST 800-171 Rev3
          </Typography>
          <Typography variant="h5" gutterBottom>
            Compliance Tracker
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
            Sign in with your Microsoft 365 account to access the compliance management system.
          </Typography>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
            sx={{ mt: 2, minWidth: 200 }}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </Button>

          <Typography variant="caption" display="block" sx={{ mt: 3 }} color="text.secondary">
            Requires Microsoft 365 E5 or equivalent license
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
```

### 7. Protected Route Component

**📁 File**: `client/src/components/common/ProtectedRoute.tsx`

🔄 **COMPLETE FILE**:

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### 8. Update AppBar with Auth

**📁 File**: `client/src/components/layout/AppBar.tsx`

Find your AppBar component and add logout functionality:

🔍 **FIND** (likely in the AppBar component):
```typescript
// Your existing AppBar implementation
```

✏️ **ADD** user menu with logout:

```typescript
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, Menu, MenuItem, IconButton } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

// Inside your AppBar component:
const { user, logout } = useAuth();
const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
  setAnchorEl(event.currentTarget);
};

const handleClose = () => {
  setAnchorEl(null);
};

const handleLogout = async () => {
  handleClose();
  await logout();
};

// Add to your AppBar toolbar:
<IconButton
  size="large"
  aria-label="account of current user"
  aria-controls="menu-appbar"
  aria-haspopup="true"
  onClick={handleMenu}
  color="inherit"
>
  <AccountCircle />
</IconButton>
<Menu
  id="menu-appbar"
  anchorEl={anchorEl}
  anchorOrigin={{
    vertical: 'top',
    horizontal: 'right',
  }}
  keepMounted
  transformOrigin={{
    vertical: 'top',
    horizontal: 'right',
  }}
  open={Boolean(anchorEl)}
  onClose={handleClose}
>
  <MenuItem disabled>
    {user?.name || user?.username}
  </MenuItem>
  <MenuItem onClick={handleLogout}>Logout</MenuItem>
</Menu>
```

### 9. Update Router with Protected Routes

**📁 File**: `client/src/App.tsx` (or your routes file)

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// ... other imports

function App() {
  return (
    // ... providers ...
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Other protected routes */}
      <Route
        path="/controls"
        element={
          <ProtectedRoute>
            <ControlLibrary />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

### 10. Auth Callback Page (Optional)

**📁 File**: `client/src/pages/AuthCallback.tsx`

🔄 **COMPLETE FILE**:

```typescript
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // MSAL handles the callback automatically
    // Just redirect to dashboard after a brief moment
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Completing sign in...
      </Typography>
    </Box>
  );
};

export default AuthCallback;
```

## 🧪 Testing

### 1. Manual Testing Checklist

Start the application and test:

```bash
# Start backend
cd server && npm run dev

# Start frontend (in another terminal)
cd client && npm run dev
```

Test flow:
1. Navigate to `http://localhost:3000`
2. Should redirect to `/login` if not authenticated
3. Click "Sign in with Microsoft"
4. Microsoft login popup should appear
5. Sign in with your M365 account
6. Consent screen may appear (approve permissions)
7. Should redirect to `/dashboard` after successful login
8. User icon/name should appear in AppBar
9. Click user menu and select "Logout"
10. Should return to login page

### 2. Test Authentication State

**📁 File**: `client/src/pages/Dashboard.tsx`

Add this to verify authentication:

```typescript
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
      <Typography>
        Welcome, {user?.name || 'User'}!
      </Typography>
      {/* Rest of dashboard */}
    </Box>
  );
};
```

### 3. Test Token Acquisition

Create a hook to get tokens:

**📁 File**: `client/src/hooks/useAccessToken.ts`

🔄 **COMPLETE FILE**:

```typescript
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

export const useAccessToken = () => {
  const { instance, accounts } = useMsal();

  const getAccessToken = async (scopes: string[]): Promise<string | null> => {
    if (accounts.length === 0) {
      return null;
    }

    try {
      // Try silent token acquisition first
      const response = await instance.acquireTokenSilent({
        scopes,
        account: accounts[0],
      });

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fall back to interactive method
        try {
          const response = await instance.acquireTokenPopup({
            scopes,
            account: accounts[0],
          });
          return response.accessToken;
        } catch (popupError) {
          console.error('Token acquisition failed:', popupError);
          return null;
        }
      }
      console.error('Token acquisition error:', error);
      return null;
    }
  };

  return { getAccessToken };
};
```

## ✅ Completion Checklist

- [ ] Azure AD app redirect URI updated for SPA
- [ ] Delegated permissions added and consented
- [ ] MSAL dependencies installed
- [ ] msal.config.ts created
- [ ] Environment variables configured
- [ ] AuthContext.tsx created
- [ ] main.tsx updated with MsalProvider
- [ ] App.tsx updated with AuthProvider
- [ ] Login page created
- [ ] ProtectedRoute component created
- [ ] AppBar updated with logout
- [ ] Routes protected with ProtectedRoute
- [ ] Login flow works end-to-end
- [ ] Logout works
- [ ] Protected routes redirect to login when not authenticated
- [ ] User info displays correctly
- [ ] Token refresh works silently

## 🔒 Security Best Practices

1. **Token Storage**: Using sessionStorage (cleared on tab close) or localStorage (persists)
2. **Silent Refresh**: MSAL automatically refreshes tokens using hidden iframe
3. **Popup vs Redirect**: Using popup for better UX, but redirect is more reliable on some browsers
4. **Scope Management**: Request minimal scopes initially, request additional as needed
5. **Error Handling**: Gracefully handle consent cancellation and auth errors

## 🔍 Troubleshooting

### Login Popup Blocked
- Check browser popup settings
- Allow popups for localhost
- Alternative: Use redirect flow instead of popup

### Consent Not Appearing
- Admin consent may already be granted
- Check Azure AD app "API permissions" page

### Token Errors
- Verify scopes match what's configured in Azure AD
- Check token expiration
- Clear browser cache and try again

## 🚀 Next Steps

After completing Part 5, proceed to:
**Part 6: M365 Dashboard & UI Components** (`PHASE_6_PART_6_FRONTEND_DASHBOARD.md`)

This will build the user interface for viewing M365 integration status and managing policy mappings.

---

**Estimated Time**: 2-3 hours
**Complexity**: Medium
**Dependencies**: Parts 1-4 (Backend complete)
