# Phase 2: Frontend Components & Page Structure

## Overview
Build the frontend Policy Viewer page structure, base components, navigation tabs, search/filter UI, and sync status indicators.

## Prerequisites
- Phase 1 (Backend API) completed
- React app running
- MUI components available

---

## Step 1: Create Policy Viewer Types (Frontend)

📁 **File:** `client/src/types/policyViewer.types.ts`

```typescript
export interface PolicyDetail {
  id: number;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyId: string;
  policyName: string;
  policyDescription: string | null;
  lastSynced: string;
  isActive: boolean;
  parsedData: ParsedPolicyData;
  mappedControls: MappedControl[];
}

export interface ParsedPolicyData {
  displayName: string;
  description?: string;
  createdDateTime?: string;
  modifiedDateTime?: string;
  settings: Record<string, any>;
  odataType?: string;
  platformType?: string;
}

export interface MappedControl {
  controlId: string;
  controlTitle: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
}

export interface PolicyViewerStats {
  totalPolicies: number;
  activePolicies: number;
  inactivePolicies: number;
  byType: {
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
  lastSyncDate: string | null;
  policiesWithMappings: number;
}

export interface PolicySearchParams {
  policyType?: 'Intune' | 'Purview' | 'AzureAD';
  searchTerm?: string;
  isActive?: boolean;
  controlId?: string;
  sortBy?: 'name' | 'lastSynced' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export type PolicyTypeTab = 'all' | 'Intune' | 'Purview' | 'AzureAD';
```

---

## Step 2: Create Policy Viewer API Service

📁 **File:** `client/src/services/policyViewer.service.ts`

```typescript
import axios from 'axios';
import {
  PolicyDetail,
  PolicyViewerStats,
  PolicySearchParams,
} from '../types/policyViewer.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class PolicyViewerService {
  /**
   * Get policies with optional filtering
   */
  async getPolicies(params?: PolicySearchParams): Promise<PolicyDetail[]> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer`, {
      params,
    });
    return response.data.policies;
  }

  /**
   * Get single policy by ID
   */
  async getPolicyById(id: number): Promise<PolicyDetail> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/${id}`);
    return response.data.policy;
  }

  /**
   * Get viewer statistics
   */
  async getStats(): Promise<PolicyViewerStats> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/stats`);
    return response.data.stats;
  }

  /**
   * Export policy data
   */
  async exportData(): Promise<any> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/export`);
    return response.data.data;
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(): Promise<any> {
    const response = await axios.post(`${API_URL}/m365/sync`, {
      forceRefresh: true,
    });
    return response.data;
  }
}

export default new PolicyViewerService();
```

---

## Step 3: Create Sync Status Indicator Component

📁 **File:** `client/src/components/policy-viewer/SyncStatusIndicator.tsx`

```typescript
import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusIndicatorProps {
  lastSyncDate: string | null;
  isSyncing?: boolean;
  onSync: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  lastSyncDate,
  isSyncing = false,
  onSync,
}) => {
  const getSyncStatus = () => {
    if (!lastSyncDate) {
      return { color: 'error', icon: <ErrorIcon />, label: 'Never synced' };
    }

    const syncDate = new Date(lastSyncDate);
    const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      return {
        color: 'success',
        icon: <CheckCircleIcon />,
        label: `Synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
      };
    } else if (hoursSinceSync < 168) {
      // 7 days
      return {
        color: 'warning',
        icon: <WarningIcon />,
        label: `Synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
      };
    } else {
      return {
        color: 'error',
        icon: <ErrorIcon />,
        label: `Stale (${formatDistanceToNow(syncDate, { addSuffix: true })})`,
      };
    }
  };

  const status = getSyncStatus();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip
        icon={status.icon}
        label={status.label}
        color={status.color as any}
        size="small"
        variant="outlined"
      />
      <Tooltip title="Sync policies now">
        <span>
          <IconButton
            onClick={onSync}
            disabled={isSyncing}
            size="small"
            color="primary"
          >
            {isSyncing ? (
              <CircularProgress size={20} />
            ) : (
              <SyncIcon />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default SyncStatusIndicator;
```

---

## Step 4: Create Policy Search Bar Component

📁 **File:** `client/src/components/policy-viewer/PolicySearchBar.tsx`

```typescript
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

interface PolicySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: 'all' | 'active' | 'inactive';
  onActiveFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  sortBy: 'name' | 'lastSynced' | 'type';
  onSortByChange: (value: 'name' | 'lastSynced' | 'type') => void;
}

const PolicySearchBar: React.FC<PolicySearchBarProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  sortBy,
  onSortByChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      {/* Search Field */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search policies..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
        sx={{ flex: 1 }}
      />

      {/* Active Filter */}
      <Box sx={{ minWidth: 200 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          Status
        </Typography>
        <ToggleButtonGroup
          value={activeFilter}
          exclusive
          onChange={(_, value) => value && onActiveFilterChange(value)}
          size="small"
          fullWidth
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="inactive">Inactive</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Sort By */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Sort By</InputLabel>
        <Select
          value={sortBy}
          label="Sort By"
          onChange={(e) => onSortByChange(e.target.value as any)}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="lastSynced">Last Synced</MenuItem>
          <MenuItem value="type">Type</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default PolicySearchBar;
```

---

## Step 5: Create Policy Tabs Component

📁 **File:** `client/src/components/policy-viewer/PolicyTabs.tsx`

```typescript
import React from 'react';
import { Tabs, Tab, Badge, Box } from '@mui/material';
import {
  ViewList as AllIcon,
  PhoneAndroid as IntuneIcon,
  Security as PurviewIcon,
  Cloud as AzureADIcon,
} from '@mui/icons-material';
import { PolicyTypeTab } from '../../types/policyViewer.types';

interface PolicyTabsProps {
  currentTab: PolicyTypeTab;
  onTabChange: (tab: PolicyTypeTab) => void;
  counts: {
    all: number;
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
}

const PolicyTabs: React.FC<PolicyTabsProps> = ({
  currentTab,
  onTabChange,
  counts,
}) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: PolicyTypeTab) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          icon={<AllIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.all} color="primary" max={999}>
              <span style={{ marginRight: 16 }}>All Policies</span>
            </Badge>
          }
          value="all"
        />
        <Tab
          icon={<IntuneIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.Intune} color="info" max={999}>
              <span style={{ marginRight: 16 }}>Intune</span>
            </Badge>
          }
          value="Intune"
        />
        <Tab
          icon={<PurviewIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.Purview} color="secondary" max={999}>
              <span style={{ marginRight: 16 }}>Purview</span>
            </Badge>
          }
          value="Purview"
        />
        <Tab
          icon={<AzureADIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.AzureAD} color="success" max={999}>
              <span style={{ marginRight: 16 }}>Azure AD</span>
            </Badge>
          }
          value="AzureAD"
        />
      </Tabs>
    </Box>
  );
};

export default PolicyTabs;
```

---

## Step 6: Create Main Policy Viewer Page

📁 **File:** `client/src/pages/PolicyViewer.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import policyViewerService from '../services/policyViewer.service';
import PolicyTabs from '../components/policy-viewer/PolicyTabs';
import PolicySearchBar from '../components/policy-viewer/PolicySearchBar';
import SyncStatusIndicator from '../components/policy-viewer/SyncStatusIndicator';
import {
  PolicyTypeTab,
  PolicySearchParams,
} from '../types/policyViewer.types';

const PolicyViewer: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [currentTab, setCurrentTab] = useState<PolicyTypeTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastSynced' | 'type'>('lastSynced');

  // Build search params
  const searchParams: PolicySearchParams = {
    policyType: currentTab !== 'all' ? currentTab : undefined,
    searchTerm: searchTerm || undefined,
    isActive:
      activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    sortBy,
    sortOrder: 'desc',
  };

  // Queries
  const {
    data: policies = [],
    isLoading: loadingPolicies,
    error: policiesError,
  } = useQuery({
    queryKey: ['policies', searchParams],
    queryFn: () => policyViewerService.getPolicies(searchParams),
  });

  const {
    data: stats,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ['policyStats'],
    queryFn: () => policyViewerService.getStats(),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => policyViewerService.triggerSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policyStats'] });
    },
  });

  // Tab counts
  const tabCounts = {
    all: stats?.totalPolicies || 0,
    Intune: stats?.byType.Intune || 0,
    Purview: stats?.byType.Purview || 0,
    AzureAD: stats?.byType.AzureAD || 0,
  };

  const handleExport = async () => {
    try {
      const exportData = await policyViewerService.exportData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `policy-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Policy Settings Viewer
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <SyncStatusIndicator
              lastSyncDate={stats?.lastSyncDate || null}
              isSyncing={syncMutation.isPending}
              onSync={() => syncMutation.mutate()}
            />
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Stats Summary */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Policies
                  </Typography>
                  <Typography variant="h4">{stats.totalPolicies}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Active Policies
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.activePolicies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Mapped to Controls
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.policiesWithMappings}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Inactive Policies
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    {stats.inactivePolicies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <PolicyTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          counts={tabCounts}
        />

        {/* Search & Filters */}
        <PolicySearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {/* Policy List */}
        <Paper sx={{ p: 2 }}>
          {loadingPolicies ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : policiesError ? (
            <Alert severity="error">Failed to load policies</Alert>
          ) : policies.length === 0 ? (
            <Alert severity="info">
              No policies found. {!stats?.lastSyncDate && 'Try syncing with Microsoft 365.'}
            </Alert>
          ) : (
            <Typography>
              Found {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              {/* Policy cards will be rendered here in Phase 3 */}
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PolicyViewer;
```

---

## Step 7: Install Required Dependencies

```bash
cd client
npm install date-fns
```

---

## Step 8: Add Route to App

📁 **File:** `client/src/App.tsx`

🔍 **FIND:**
```typescript
import { Route, Routes } from 'react-router-dom';
```

➕ **ADD AFTER:** other page imports
```typescript
import PolicyViewer from './pages/PolicyViewer';
```

🔍 **FIND:** the Routes section

➕ **ADD BEFORE:** the closing `</Routes>` tag
```typescript
<Route path="/policy-viewer" element={<PolicyViewer />} />
```

---

## Step 9: Add Navigation Link

📁 **File:** `client/src/components/layout/Sidebar.tsx`

🔍 **FIND:** the navigation items array

➕ **ADD** a new menu item:
```typescript
{
  text: 'Policy Viewer',
  icon: <PolicyIcon />,
  path: '/policy-viewer',
}
```

➕ **ADD AFTER:** other icon imports at top:
```typescript
import PolicyIcon from '@mui/icons-material/Policy';
```

---

## Verification Checklist

- [ ] All new files created in correct locations
- [ ] date-fns dependency installed
- [ ] Types file matches backend types
- [ ] API service methods implemented
- [ ] SyncStatusIndicator component renders
- [ ] PolicySearchBar component renders
- [ ] PolicyTabs component renders
- [ ] PolicyViewer page renders without errors
- [ ] Route added to App.tsx
- [ ] Navigation link added to sidebar
- [ ] Can navigate to /policy-viewer
- [ ] Stats cards display (if policies synced)
- [ ] Search, filter, and sort controls work
- [ ] Sync button triggers sync
- [ ] Export button creates JSON file

---

## Common Issues & Solutions

**Issue:** "date-fns not found"
- **Solution:** Run `npm install date-fns` in client directory

**Issue:** Page shows "No policies found"
- **Solution:** Run sync from M365 Dashboard or use sync button in Policy Viewer

**Issue:** Stats cards show 0
- **Solution:** Ensure backend has synced policies, check `/api/m365/policies/viewer/stats`

**Issue:** TypeScript errors about PolicyDetail types
- **Solution:** Ensure frontend types match backend types exactly

---

## Next Steps

Proceed to **Phase 3** (`03_POLICY_VIEWERS.md`) to build policy-type-specific card components that display the actual policy details.
