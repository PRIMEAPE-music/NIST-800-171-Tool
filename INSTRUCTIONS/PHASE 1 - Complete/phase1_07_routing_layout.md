# Phase 1.7: React Router & Layout

## Objective
Implement React Router v6, create core layout components with dark theme, and set up navigation structure with placeholder pages.

**Duration:** 3-4 hours  
**Prerequisites:** Phase 1.2 complete  
**Dependencies:** React Router v6, Material-UI

---

## Tasks Overview

1. ✅ Set up React Router v6 with route configuration
2. ✅ Create AppBar component with dark theme
3. ✅ Create Sidebar/Drawer navigation
4. ✅ Create Layout wrapper component
5. ✅ Create placeholder pages for all routes
6. ✅ Add navigation menu items
7. ✅ Implement responsive design

---

## Step-by-Step Instructions

### Step 1: Update App.tsx with Router

📁 **File:** `client/src/App.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tantml:react-query';
import { theme } from '@/styles/theme';
import { Layout } from '@/components/layout/Layout';
import { AppRoutes } from '@/routes';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout>
            <AppRoutes />
          </Layout>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
```

---

### Step 2: Create Routes Configuration

📁 **File:** `client/src/routes/index.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { ControlLibrary } from '@/pages/ControlLibrary';
import { ControlDetailPage } from '@/pages/ControlDetailPage';
import { GapAnalysis } from '@/pages/GapAnalysis';
import { POAMManager } from '@/pages/POAMManager';
import { Evidence } from '@/pages/Evidence';
import { M365Integration } from '@/pages/M365Integration';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/controls" element={<ControlLibrary />} />
      <Route path="/controls/:id" element={<ControlDetailPage />} />
      <Route path="/gap-analysis" element={<GapAnalysis />} />
      <Route path="/poams" element={<POAMManager />} />
      <Route path="/evidence" element={<Evidence />} />
      <Route path="/m365" element={<M365Integration />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
```

---

### Step 3: Create Navigation Configuration

📁 **File:** `client/src/config/navigation.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import CloudIcon from '@mui/icons-material/Cloud';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';

export interface NavigationItem {
  label: string;
  path: string;
  icon: typeof DashboardIcon;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
    description: 'Compliance overview and statistics',
  },
  {
    label: 'Control Library',
    path: '/controls',
    icon: ListAltIcon,
    description: 'All 111 NIST 800-171 Rev 3 controls',
  },
  {
    label: 'Gap Analysis',
    path: '/gap-analysis',
    icon: AssessmentIcon,
    description: 'Assess and prioritize compliance gaps',
  },
  {
    label: 'POAMs',
    path: '/poams',
    icon: AssignmentIcon,
    description: 'Plan of Action & Milestones',
  },
  {
    label: 'Evidence',
    path: '/evidence',
    icon: FolderIcon,
    description: 'Compliance documentation repository',
  },
  {
    label: 'M365 Integration',
    path: '/m365',
    icon: CloudIcon,
    description: 'Microsoft 365 policy sync',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: DescriptionIcon,
    description: 'Generate compliance reports',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
    description: 'Application configuration',
  },
];
```

---

### Step 4: Create AppBar Component

📁 **File:** `client/src/components/layout/AppBar.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SecurityIcon from '@mui/icons-material/Security';

interface AppBarProps {
  onMenuClick: () => void;
}

export const AppBar: React.FC<AppBarProps> = ({ onMenuClick }) => {
  return (
    <MuiAppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#2C2C2C',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <SecurityIcon sx={{ mr: 1.5 }} />
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          NIST 800-171 Compliance Tracker
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            Phase 1: Development
          </Typography>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};
```

---

### Step 5: Create Sidebar Component

📁 **File:** `client/src/components/layout/Sidebar.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import { navigationItems } from '@/config/navigation';

const DRAWER_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 900) {
      onClose();
    }
  };

  const drawerContent = (
    <Box>
      <Toolbar />
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ color: '#B0B0B0', fontSize: '0.7rem' }}>
          Navigation
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(144, 202, 249, 0.16)',
                    '&:hover': {
                      backgroundColor: 'rgba(144, 202, 249, 0.24)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#90CAF9' : '#B0B0B0' }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#E0E0E0' : '#B0B0B0',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#1E1E1E',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#1E1E1E',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
```

---

### Step 6: Create Layout Component

📁 **File:** `client/src/components/layout/Layout.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar onMenuClick={handleDrawerToggle} />
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#121212',
          minHeight: '100vh',
          width: { sm: `calc(100% - 260px)` },
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        {children}
      </Box>
    </Box>
  );
};
```

---

### Step 7: Create Placeholder Pages

Create the pages directory structure:
```bash
mkdir -p client/src/pages
```

📁 **File:** `client/src/pages/Dashboard.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Compliance overview and statistics will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/ControlLibrary.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const ControlLibrary: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Control Library
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          All 111 NIST 800-171 Rev 3 controls will be listed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/ControlDetailPage.tsx`

```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';

export const ControlDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Control Detail - {id}
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Detailed control information will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/GapAnalysis.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const GapAnalysis: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Gap Analysis
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Assessment wizard and gap analysis will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/POAMManager.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const POAMManager: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        POAM Manager
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Plan of Action & Milestones management will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/Evidence.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const Evidence: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Evidence Management
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Evidence library and file management will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/M365Integration.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const M365Integration: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Microsoft 365 Integration
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          M365 policy synchronization and mapping will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/Reports.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Reports
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Report generation and export will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

📁 **File:** `client/src/pages/Settings.tsx`

```typescript
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Application settings and configuration will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
```

---

## Verification Steps

### 1. Check TypeScript Compilation

```bash
cd client
npm run type-check
```

**Expected:** No errors

### 2. Start Development Server

```bash
npm run dev
```

**Expected:** Server starts on port 3000

### 3. Test Navigation

Open http://localhost:3000

**Verify:**
- AppBar displays at top with app title
- Sidebar visible on desktop
- Menu icon works on mobile
- All navigation items listed
- Clicking items navigates to placeholder pages
- Active route highlighted in sidebar
- Dark theme colors throughout

### 4. Test Routing

Manually navigate to URLs:
- http://localhost:3000/dashboard
- http://localhost:3000/controls
- http://localhost:3000/gap-analysis
- http://localhost:3000/poams

**Expected:** Correct page displays for each route

### 5. Test Responsive Design

Resize browser window or use dev tools mobile view.

**Expected:**
- Desktop (>960px): Permanent sidebar
- Mobile (<960px): Hamburger menu, temporary drawer

---

## Next Steps

✅ **Phase 1.7 Complete!**

Proceed to **[Phase 1.8: API Foundation](./phase1_08_api_foundation.md)**

---

## Checklist

- [ ] React Router v6 configured
- [ ] Routes defined for all pages
- [ ] AppBar component created with dark theme
- [ ] Sidebar component with navigation items
- [ ] Layout wrapper component
- [ ] All 9 placeholder pages created
- [ ] Navigation configuration file
- [ ] Active route highlighting works
- [ ] Responsive design (mobile + desktop)
- [ ] No TypeScript errors
- [ ] Navigation between pages works
- [ ] Dark theme applied consistently

---

**Status:** Ready for Phase 1.8  
**Estimated Time:** 3-4 hours  
**Last Updated:** 2025-11-06
