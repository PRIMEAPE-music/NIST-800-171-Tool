# Phase 2.2: Control Library UI

## Overview
**Goal:** Build comprehensive Control Library page with filtering, search, and sorting  
**Duration:** 2-3 days  
**Prerequisites:** Phase 2.1 Backend API completed

## Objectives
1. ✅ Display all 110 NIST 800-171r3 controls in a data table
2. ✅ Implement advanced filtering (family, status, priority)
3. ✅ Add search functionality across control text
4. ✅ Enable sorting on multiple columns
5. ✅ Implement bulk operations for status updates
6. ✅ Add pagination or virtualization for performance

## Component Architecture

### Page Structure
```
ControlLibrary (Page)
├── ControlFilters (Sidebar)
├── ControlTable (Main Content)
│   ├── ControlTableToolbar (Search, bulk actions)
│   ├── ControlTableHead (Column headers with sort)
│   └── ControlTableBody
│       └── ControlRow[] (Individual rows)
└── ControlDialog (Quick view/edit modal)
```

## Implementation Guide

### 1. ControlLibrary Page Component

**File:** `client/src/pages/ControlLibrary.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Drawer,
  IconButton,
  Fab
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { controlService } from '../services/controlService';
import ControlFilters from '../components/controls/ControlFilters';
import ControlTable from '../components/controls/ControlTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

// Filter state interface
interface FilterState {
  families: string[];
  statuses: string[];
  priorities: string[];
  search: string;
}

const ControlLibrary: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    families: [],
    statuses: [],
    priorities: [],
    search: ''
  });
  const [sortBy, setSortBy] = useState<string>('controlId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
  const [selectedControls, setSelectedControls] = useState<number[]>([]);

  // Fetch controls with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['controls', filters, sortBy, sortOrder, page],
    queryFn: () => controlService.getControls({
      ...filters,
      family: filters.families.join(','),
      status: filters.statuses.join(','),
      priority: filters.priorities.join(','),
      sortBy,
      sortOrder,
      page,
      limit: 50
    })
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  };

  // Handle sort change
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedControls(data?.controls.map(c => c.id) || []);
    } else {
      setSelectedControls([]);
    }
  };

  const handleSelectOne = (controlId: number, checked: boolean) => {
    if (checked) {
      setSelectedControls(prev => [...prev, controlId]);
    } else {
      setSelectedControls(prev => prev.filter(id => id !== controlId));
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      families: [],
      statuses: [],
      priorities: [],
      search: ''
    });
    setPage(1);
  };

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.families.length > 0 ||
           filters.statuses.length > 0 ||
           filters.priorities.length > 0 ||
           filters.search.length > 0;
  }, [filters]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load controls" />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Control Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data?.pagination.total || 0} NIST 800-171 Rev 3 Controls
            {hasActiveFilters && ` (${data?.controls.length || 0} filtered)`}
          </Typography>
        </Box>
        
        {/* Filter toggle for mobile */}
        <IconButton
          onClick={() => setFilterDrawerOpen(true)}
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          <FilterIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Filters Sidebar - Desktop */}
        <Paper
          sx={{
            width: 280,
            flexShrink: 0,
            p: 2,
            display: { xs: 'none', md: 'block' }
          }}
        >
          <ControlFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </Paper>

        {/* Filters Drawer - Mobile */}
        <Drawer
          anchor="left"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          <Box sx={{ width: 280, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Filters</Typography>
              <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <ControlFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </Box>
        </Drawer>

        {/* Main Table */}
        <Box sx={{ flexGrow: 1 }}>
          <ControlTable
            controls={data?.controls || []}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            selectedControls={selectedControls}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            page={page}
            totalPages={data?.pagination.totalPages || 1}
            onPageChange={setPage}
            onRefresh={refetch}
          />
        </Box>
      </Box>

      {/* Floating action button for filters on mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => setFilterDrawerOpen(true)}
      >
        <FilterIcon />
      </Fab>
    </Container>
  );
};

export default ControlLibrary;
```

### 2. ControlFilters Component

**File:** `client/src/components/controls/ControlFilters.tsx`

```typescript
import React from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  Chip,
  TextField
} from '@mui/material';
import { ControlFamily, ControlStatus, ControlPriority } from '../../types/enums';

interface ControlFiltersProps {
  filters: {
    families: string[];
    statuses: string[];
    priorities: string[];
    search: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

const FAMILY_LABELS: Record<string, string> = {
  AC: 'Access Control (22)',
  AT: 'Awareness & Training (3)',
  AU: 'Audit & Accountability (9)',
  CA: 'Security Assessment (9)',
  CM: 'Configuration Mgmt (11)',
  CP: 'Contingency Planning (3)',
  IA: 'Identification & Auth (11)',
  IR: 'Incident Response (5)',
  MA: 'Maintenance (6)',
  MP: 'Media Protection (7)',
  PE: 'Physical Protection (6)',
  PS: 'Personnel Security (8)',
  RA: 'Risk Assessment (5)',
  SC: 'System & Comm Protection (13)',
  SI: 'System & Info Integrity (17)',
  SR: 'Supply Chain Risk Mgmt (6)' // NEW in r3
};

const ControlFilters: React.FC<ControlFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const handleFamilyChange = (family: string, checked: boolean) => {
    const newFamilies = checked
      ? [...filters.families, family]
      : filters.families.filter(f => f !== family);
    onFilterChange({ families: newFamilies });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.statuses, status]
      : filters.statuses.filter(s => s !== status);
    onFilterChange({ statuses: newStatuses });
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    const newPriorities = checked
      ? [...filters.priorities, priority]
      : filters.priorities.filter(p => p !== priority);
    onFilterChange({ priorities: newPriorities });
  };

  const activeFilterCount = 
    filters.families.length + 
    filters.statuses.length + 
    filters.priorities.length +
    (filters.search ? 1 : 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Filters
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={onClearFilters}>
            Clear All
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search controls..."
        value={filters.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      {/* Control Families */}
      <Typography variant="subtitle2" gutterBottom>
        Control Family
      </Typography>
      <FormGroup sx={{ mb: 2 }}>
        {Object.entries(FAMILY_LABELS).map(([code, label]) => (
          <FormControlLabel
            key={code}
            control={
              <Checkbox
                checked={filters.families.includes(code)}
                onChange={(e) => handleFamilyChange(code, e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">{label}</Typography>}
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      {/* Status */}
      <Typography variant="subtitle2" gutterBottom>
        Implementation Status
      </Typography>
      <FormGroup sx={{ mb: 2 }}>
        {Object.values(ControlStatus).map(status => (
          <FormControlLabel
            key={status}
            control={
              <Checkbox
                checked={filters.statuses.includes(status)}
                onChange={(e) => handleStatusChange(status, e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">{status}</Typography>}
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      {/* Priority */}
      <Typography variant="subtitle2" gutterBottom>
        Priority Level
      </Typography>
      <FormGroup>
        {Object.values(ControlPriority).map(priority => (
          <FormControlLabel
            key={priority}
            control={
              <Checkbox
                checked={filters.priorities.includes(priority)}
                onChange={(e) => handlePriorityChange(priority, e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">{priority}</Typography>}
          />
        ))}
      </FormGroup>
    </Box>
  );
};

export default ControlFilters;
```

### 3. ControlTable Component

**File:** `client/src/components/controls/ControlTable.tsx`

```typescript
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import BulkActionsDialog from './BulkActionsDialog';

interface Control {
  id: number;
  controlId: string;
  family: string;
  title: string;
  priority: string;
  status?: {
    status: string;
    assignedTo?: string;
  };
  evidence: any[];
}

interface ControlTableProps {
  controls: Control[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  selectedControls: number[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

const ControlTable: React.FC<ControlTableProps> = ({
  controls,
  sortBy,
  sortOrder,
  onSortChange,
  selectedControls,
  onSelectAll,
  onSelectOne,
  page,
  totalPages,
  onPageChange,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const allSelected = controls.length > 0 && 
    selectedControls.length === controls.length;
  const someSelected = selectedControls.length > 0 && 
    selectedControls.length < controls.length;

  const handleRowClick = (controlId: number) => {
    navigate(`/controls/${controlId}`);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  return (
    <Paper>
      {/* Toolbar with bulk actions */}
      {selectedControls.length > 0 && (
        <Toolbar sx={{ bgcolor: 'action.selected' }}>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            {selectedControls.length} selected
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Actions
          </Button>
        </Toolbar>
      )}

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSortChange('controlId')}
                >
                  Control ID
                  <SortIcon column="controlId" />
                </Box>
              </TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSortChange('family')}
                >
                  Family
                  <SortIcon column="family" />
                </Box>
              </TableCell>
              <TableCell>Title</TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSortChange('priority')}
                >
                  Priority
                  <SortIcon column="priority" />
                </Box>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell align="center">Evidence</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controls.map((control) => (
              <TableRow
                key={control.id}
                hover
                selected={selectedControls.includes(control.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedControls.includes(control.id)}
                    onChange={(e) => onSelectOne(control.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" fontWeight="medium">
                    {control.controlId}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2">{control.family}</Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {control.title}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography
                    variant="body2"
                    color={
                      control.priority === 'Critical' ? 'error' :
                      control.priority === 'High' ? 'warning.main' :
                      'text.secondary'
                    }
                  >
                    {control.priority}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <StatusBadge status={control.status?.status || 'Not Started'} />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" color="text.secondary">
                    {control.status?.assignedTo || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center" onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2">
                    {control.evidence?.length || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(control.id);
                  }}>
                    <MoreVert fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Button
          startIcon={<Refresh />}
          onClick={onRefresh}
          size="small"
        >
          Refresh
        </Button>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            size="small"
          >
            Previous
          </Button>
          <Typography variant="body2" color="text.secondary">
            Page {page} of {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        selectedControlIds={selectedControls}
        onSuccess={() => {
          setBulkDialogOpen(false);
          onRefresh();
        }}
      />
    </Paper>
  );
};

export default ControlTable;
```

### 4. StatusBadge Component

**File:** `client/src/components/controls/StatusBadge.tsx`

```typescript
import React from 'react';
import { Chip } from '@mui/material';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_COLORS: Record<string, any> = {
  'Not Started': {
    color: '#757575',
    bgcolor: 'rgba(117, 117, 117, 0.1)'
  },
  'In Progress': {
    color: '#FFA726',
    bgcolor: 'rgba(255, 167, 38, 0.1)'
  },
  'Implemented': {
    color: '#66BB6A',
    bgcolor: 'rgba(102, 187, 106, 0.1)'
  },
  'Verified': {
    color: '#42A5F5',
    bgcolor: 'rgba(66, 165, 245, 0.1)'
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];

  return (
    <Chip
      label={status}
      size={size}
      sx={{
        color: colors.color,
        bgcolor: colors.bgcolor,
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem'
      }}
    />
  );
};

export default StatusBadge;
```

### 5. BulkActionsDialog Component

**File:** `client/src/components/controls/BulkActionsDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { controlService } from '../../services/controlService';
import { ControlStatus } from '../../types/enums';

interface BulkActionsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedControlIds: number[];
  onSuccess: () => void;
}

const BulkActionsDialog: React.FC<BulkActionsDialogProps> = ({
  open,
  onClose,
  selectedControlIds,
  onSuccess
}) => {
  const [operation, setOperation] = useState<'updateStatus' | 'assign'>('updateStatus');
  const [status, setStatus] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: any) => controlService.bulkUpdate(data),
    onSuccess: () => {
      onSuccess();
      handleClose();
    }
  });

  const handleClose = () => {
    setOperation('updateStatus');
    setStatus('');
    setAssignedTo('');
    onClose();
  };

  const handleSubmit = () => {
    const data = operation === 'updateStatus'
      ? { status }
      : { assignedTo };

    bulkUpdateMutation.mutate({
      controlIds: selectedControlIds,
      operation,
      data
    });
  };

  const isValid = operation === 'updateStatus' 
    ? status !== ''
    : assignedTo !== '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Update {selectedControlIds.length} Controls
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl component="fieldset">
            <RadioGroup
              value={operation}
              onChange={(e) => setOperation(e.target.value as any)}
            >
              <FormControlLabel
                value="updateStatus"
                control={<Radio />}
                label="Update Status"
              />
              <FormControlLabel
                value="assign"
                control={<Radio />}
                label="Assign To User"
              />
            </RadioGroup>
          </FormControl>

          <Box sx={{ mt: 3 }}>
            {operation === 'updateStatus' ? (
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  label="Status"
                >
                  {Object.values(ControlStatus).map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                label="Assigned To"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter name or email"
              />
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            This action will update all {selectedControlIds.length} selected controls.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || bulkUpdateMutation.isPending}
        >
          {bulkUpdateMutation.isPending ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionsDialog;
```

### 6. Control Service

**File:** `client/src/services/controlService.ts`

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const controlService = {
  getControls: async (params: any) => {
    const response = await axios.get(`${API_BASE}/controls`, { params });
    return response.data;
  },

  getControlById: async (id: number) => {
    const response = await axios.get(`${API_BASE}/controls/${id}`);
    return response.data;
  },

  updateControl: async (id: number, data: any) => {
    const response = await axios.put(`${API_BASE}/controls/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: number, data: any) => {
    const response = await axios.patch(`${API_BASE}/controls/${id}/status`, data);
    return response.data;
  },

  bulkUpdate: async (data: any) => {
    const response = await axios.post(`${API_BASE}/controls/bulk`, data);
    return response.data;
  }
};
```

## Dark Theme Integration

Ensure all components use the dark theme colors specified in the project overview:

```typescript
// Example theme usage in MUI
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#242424'
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0'
    },
    divider: 'rgba(255, 255, 255, 0.08)'
  }
});
```

## Testing Checklist

### Functionality Tests
- [ ] All 110 controls display correctly
- [ ] Filters work individually and in combination
- [ ] Search returns relevant results across control ID, title, and requirement text
- [ ] Sorting works on all sortable columns
- [ ] Pagination navigates correctly
- [ ] Row selection (individual and all)
- [ ] Bulk actions execute successfully
- [ ] Navigation to control detail works
- [ ] Refresh updates data
- [ ] Mobile responsive filters drawer

### Performance Tests
- [ ] Initial load time < 2 seconds
- [ ] Filter operations feel instant
- [ ] No lag when selecting/deselecting multiple rows
- [ ] Table scrolling is smooth

### UI/UX Tests
- [ ] Dark theme applied correctly
- [ ] All text is readable
- [ ] Hover states work properly
- [ ] Active filter count displays correctly
- [ ] Empty states show when no results
- [ ] Loading states during API calls

## Next Steps
After completing Phase 2.2, proceed to **PHASE_2.3_CONTROL_DETAIL.md** to build the individual control detail page.
