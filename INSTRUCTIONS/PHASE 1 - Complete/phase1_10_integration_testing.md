# Phase 1.10: Integration & Testing

## Objective
Connect frontend to backend, create API service layer, implement data fetching, and perform comprehensive end-to-end testing of the complete Phase 1 application.

**Duration:** 2-3 hours  
**Prerequisites:** All Phase 1.1-1.9 complete  
**Dependencies:** Axios, React Query

---

## Tasks Overview

1. ✅ Configure Axios HTTP client
2. ✅ Create API service layer
3. ✅ Connect frontend to backend
4. ✅ Test data flow from database to UI
5. ✅ Verify CORS configuration
6. ✅ Perform end-to-end smoke tests
7. ✅ Create Phase 1 completion checklist

---

## Step-by-Step Instructions

### Step 1: Create Axios Instance

📁 **File:** `client/src/services/api.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { clientConfig } from '@/config/env';

// Create Axios instance with base configuration
export const api: AxiosInstance = axios.create({
  baseURL: clientConfig.api.baseUrl,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here in future
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### Step 2: Create Control API Service

📁 **File:** `client/src/services/controlService.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import api from './api';

export interface Control {
  id: number;
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: string;
  status?: {
    status: string;
    implementationDate?: string;
    lastReviewedDate?: string;
    assignedTo?: string;
    implementationNotes?: string;
  };
}

export interface ComplianceStats {
  total: number;
  byStatus: Record<string, number>;
  byFamily: Array<{ family: string; _count: number }>;
  byPriority: Array<{ priority: string; _count: number }>;
  compliancePercentage: number;
}

export interface ControlFilters {
  family?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export const controlService = {
  /**
   * Get all controls with optional filters
   */
  async getAllControls(filters?: ControlFilters): Promise<Control[]> {
    const params = new URLSearchParams();
    
    if (filters?.family) params.append('family', filters.family);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<{ success: boolean; data: Control[]; count: number }>(
      `/controls?${params.toString()}`
    );
    
    return response.data.data;
  },

  /**
   * Get compliance statistics
   */
  async getComplianceStats(): Promise<ComplianceStats> {
    const response = await api.get<{ success: boolean; data: ComplianceStats }>(
      '/controls/stats'
    );
    
    return response.data.data;
  },

  /**
   * Get control by database ID
   */
  async getControlById(id: number): Promise<Control> {
    const response = await api.get<{ success: boolean; data: Control }>(
      `/controls/${id}`
    );
    
    return response.data.data;
  },

  /**
   * Get control by control ID (e.g., "03.01.01" for Rev 3)
   */
  async getControlByControlId(controlId: string): Promise<Control> {
    const response = await api.get<{ success: boolean; data: Control }>(
      `/controls/control/${controlId}`
    );
    
    return response.data.data;
  },

  /**
   * Update control status
   */
  async updateControlStatus(
    id: number,
    data: {
      status: string;
      implementationNotes?: string;
      assignedTo?: string;
    }
  ): Promise<void> {
    await api.put(`/controls/${id}/status`, data);
  },
};
```

---

### Step 3: Create React Query Hooks

📁 **File:** `client/src/hooks/useControls.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlService, ControlFilters } from '@/services/controlService';

/**
 * Hook to fetch all controls with optional filters
 */
export function useControls(filters?: ControlFilters) {
  return useQuery({
    queryKey: ['controls', filters],
    queryFn: () => controlService.getAllControls(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch compliance statistics
 */
export function useComplianceStats() {
  return useQuery({
    queryKey: ['compliance-stats'],
    queryFn: () => controlService.getComplianceStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single control by database ID
 */
export function useControl(id: number) {
  return useQuery({
    queryKey: ['control', id],
    queryFn: () => controlService.getControlById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch a single control by control ID
 */
export function useControlByControlId(controlId: string) {
  return useQuery({
    queryKey: ['control', controlId],
    queryFn: () => controlService.getControlByControlId(controlId),
    enabled: !!controlId,
  });
}

/**
 * Hook to update control status
 */
export function useUpdateControlStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { status: string; implementationNotes?: string; assignedTo?: string };
    }) => controlService.updateControlStatus(id, data),
    onSuccess: () => {
      // Invalidate and refetch controls and stats
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    },
  });
}
```

---

### Step 4: Update Dashboard with Real Data

📁 **File:** `client/src/pages/Dashboard.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useComplianceStats } from '@/hooks/useControls';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useComplianceStats();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load compliance statistics. Please ensure the backend server is running.
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0', mb: 3 }}>
        Compliance Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Overall Compliance */}
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#242424' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#B0B0B0', mb: 1 }}>
                Overall Compliance
              </Typography>
              <Typography variant="h3" sx={{ color: '#90CAF9', fontWeight: 'bold' }}>
                {stats.compliancePercentage}%
              </Typography>
              <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 1 }}>
                {stats.byStatus['Implemented'] + stats.byStatus['Verified']} of {stats.total} Rev 3 controls
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} md={9}>
          <Card sx={{ backgroundColor: '#242424' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#B0B0B0', mb: 2 }}>
                Controls by Status
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <Grid item xs={6} sm={3} key={status}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ color: '#E0E0E0' }}>
                        {count}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                        {status}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Family Breakdown */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, backgroundColor: '#242424' }}>
            <Typography variant="h6" sx={{ color: '#B0B0B0', mb: 2 }}>
              Controls by Family
            </Typography>
            <Grid container spacing={2}>
              {stats.byFamily.map((family) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={family.family}>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#1E1E1E',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" sx={{ color: '#E0E0E0' }}>
                      {family._count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                      {family.family}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Priority Breakdown */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, backgroundColor: '#242424' }}>
            <Typography variant="h6" sx={{ color: '#B0B0B0', mb: 2 }}>
              Controls by Priority
            </Typography>
            <Grid container spacing={2}>
              {stats.byPriority.map((priority) => (
                <Grid item xs={6} sm={3} key={priority.priority}>
                  <Box textAlign="center">
                    <Typography variant="h4" sx={{ color: '#E0E0E0' }}>
                      {priority._count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                      {priority.priority}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
```

---

### Step 5: Update Control Library with Real Data

📁 **File:** `client/src/pages/ControlLibrary.tsx`

🔄 **COMPLETE REWRITE:**
```typescript
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useControls } from '@/hooks/useControls';
import { getStatusColor } from '@/styles/theme';

export const ControlLibrary: React.FC = () => {
  const { data: controls, isLoading, error } = useControls();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load controls. Please ensure the backend server is running.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0', mb: 3 }}>
        Control Library
      </Typography>

      <Paper sx={{ backgroundColor: '#242424' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1E1E1E' }}>
                <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Family</TableCell>
                <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controls?.map((control) => (
                <TableRow
                  key={control.id}
                  sx={{
                    '&:hover': { backgroundColor: '#2C2C2C' },
                    cursor: 'pointer',
                  }}
                >
                  <TableCell sx={{ color: '#90CAF9' }}>{control.controlId}</TableCell>
                  <TableCell sx={{ color: '#B0B0B0' }}>
                    <Chip label={control.family} size="small" />
                  </TableCell>
                  <TableCell sx={{ color: '#E0E0E0' }}>{control.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={control.priority}
                      size="small"
                      sx={{
                        backgroundColor:
                          control.priority === 'Critical'
                            ? '#F44336'
                            : control.priority === 'High'
                            ? '#FF9800'
                            : control.priority === 'Medium'
                            ? '#FFA726'
                            : '#757575',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={control.status?.status || 'Not Started'}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(
                          control.status?.status || 'Not Started'
                        ),
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 2 }}>
        Showing {controls?.length || 0} Rev 3 controls
      </Typography>
    </Box>
  );
};
```

---

## Verification Steps

### 1. Start Backend Server

```bash
cd server
npm run dev
```

**Verify:** Server running on port 3001

### 2. Start Frontend Server

```bash
cd client
npm run dev
```

**Verify:** Client running on port 3000

### 3. Test Health Check

```bash
curl http://localhost:3001/health | jq .
```

**Expected:** Database connected successfully

### 4. Test API Endpoints

```bash
# Get all controls
curl http://localhost:3001/api/controls | jq '.count'

# Get stats
curl http://localhost:3001/api/controls/stats | jq .
```

**Expected:** Valid JSON responses

### 5. Test Frontend-Backend Integration

Open browser to http://localhost:3000

**Verify Dashboard:**
- [ ] Overall compliance percentage displays
- [ ] Status breakdown shows counts
- [ ] Family breakdown displays all families
- [ ] Priority breakdown displays
- [ ] No loading errors in console

**Verify Control Library:**
- [ ] Table displays all 110 controls
- [ ] Control IDs, families, titles visible
- [ ] Status chips display correctly
- [ ] Priority chips display with correct colors

### 6. Test CORS

Open browser console (F12) and check for CORS errors.

**Expected:** No CORS errors

### 7. Test Error Handling

Stop backend server and reload frontend.

**Expected:** Error messages display gracefully

---

## End-to-End Smoke Test

### Phase 1 Completion Checklist

Run through this checklist to verify Phase 1 is complete:

#### ✅ Project Structure
- [ ] Monorepo with client/ and server/ directories
- [ ] data/ directory with controls JSON
- [ ] database/ directory with SQLite file
- [ ] uploads/ directory exists
- [ ] .gitignore configured correctly

#### ✅ Backend (Server)
- [ ] Express server runs on port 3001
- [ ] TypeScript compilation succeeds (no errors)
- [ ] Database connected (health endpoint shows "connected")
- [ ] Prisma Client generated
- [ ] All 111 Rev 3 controls seeded in database
- [ ] `/api/controls` endpoint returns 111 controls
- [ ] `/api/controls/stats` endpoint returns statistics with 18 families
- [ ] Control IDs in Rev 3 format (03.XX.YY)
- [ ] Error handling works (test with invalid routes)

#### ✅ Frontend (Client)
- [ ] React app runs on port 3000
- [ ] TypeScript compilation succeeds (no errors)
- [ ] Dark theme applied throughout
- [ ] Navigation sidebar displays with all items
- [ ] All 9 pages accessible via navigation
- [ ] Active route highlighted in sidebar
- [ ] Responsive design works (test mobile view)

#### ✅ Integration
- [ ] Frontend successfully fetches data from backend
- [ ] Dashboard displays real compliance statistics
- [ ] Control Library displays all 111 Rev 3 controls
- [ ] Family breakdown shows all 18 families (including SA, SR, PL)
- [ ] No CORS errors in browser console
- [ ] Loading states display during data fetch
- [ ] Error states display when backend unavailable

#### ✅ Configuration
- [ ] .env.example files created for both client and server
- [ ] .env files created from examples
- [ ] Environment variables load correctly
- [ ] No secrets committed to Git

---

## Common Issues & Solutions

### Issue: CORS errors

**Solution:**
```bash
# Check CLIENT_URL in server/.env matches frontend URL exactly
echo "CLIENT_URL=http://localhost:3000" >> server/.env
# Restart backend server
```

### Issue: "Cannot fetch data"

**Solution:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check `VITE_API_URL` in client/.env: `http://localhost:3001/api`
3. Check browser console for actual error

### Issue: Database empty

**Solution:**
```bash
cd server
npx prisma db seed
```

---

## Performance Check

Run these commands to verify everything is working efficiently:

```bash
# Check API response time
time curl http://localhost:3001/api/controls/stats

# Should be < 1 second

# Check database file size
ls -lh ../database/compliance.db

# Should be ~100-200KB with 111 Rev 3 controls
```

---

## Phase 1 Complete! 🎉

### What We've Built

✅ **Full-Stack Architecture**
- React + TypeScript frontend with dark theme
- Express + TypeScript backend with Prisma ORM
- SQLite database with all 111 NIST 800-171 Rev 3 controls

✅ **Core Features**
- Compliance dashboard with real-time statistics
- Control library with 111 Rev 3 controls (18 families)
- RESTful API with CRUD operations
- Database seeded with official NIST 800-171 Rev 3 controls
- Support for new Rev 3 families: SA, SR, PL

✅ **Development Infrastructure**
- Type-safe configuration management
- Error handling and logging
- API service layer with React Query
- Responsive dark theme UI

### What's Next?

**Phase 2: Core Control Management** will add:
- Detailed control view
- Status updates
- Implementation notes
- Evidence linking
- Search and filtering
- Bulk operations

---

## Checklist

- [ ] Backend server running successfully
- [ ] Frontend server running successfully
- [ ] Health check passes
- [ ] API endpoints return data
- [ ] Dashboard displays real statistics with 18 families
- [ ] Control Library shows all 111 Rev 3 controls
- [ ] Control IDs in Rev 3 format (03.XX.YY)
- [ ] New families (SA, SR, PL) visible
- [ ] No CORS errors
- [ ] No TypeScript errors
- [ ] Environment configured correctly
- [ ] All verification steps pass
- [ ] Phase 1 completion checklist 100% complete

---

**Status:** Phase 1 COMPLETE! 🎉  
**Estimated Time:** 2-3 hours  
**Last Updated:** 2025-11-06

**Next:** [Phase 2: Core Control Management](./PHASE_2_INDEX.md)
