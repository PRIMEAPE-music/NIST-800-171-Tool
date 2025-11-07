# Phase 4 Part 5: POAM Manager Main Page

## Objective
Create the main POAMManager page that integrates all POAM components and provides the complete user interface.

---

## Step 1: Custom Hook for POAM Operations

📁 `/client/src/hooks/usePOAMs.ts`

🔄 **CREATE NEW FILE:**

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poamApi } from '../services/poam.api';
import {
  PoamWithControl,
  CreatePoamDto,
  UpdatePoamDto,
  PoamFilters,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from '../types/poam.types';

export const usePOAMs = (initialFilters?: PoamFilters) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PoamFilters>(initialFilters || {});

  // Fetch all POAMs
  const {
    data: poams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['poams', filters],
    queryFn: () => poamApi.getAllPoams(filters),
  });

  // Fetch POAM stats
  const { data: stats } = useQuery({
    queryKey: ['poam-stats'],
    queryFn: poamApi.getPoamStats,
  });

  // Create POAM
  const createMutation = useMutation({
    mutationFn: (data: CreatePoamDto) => poamApi.createPoam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Update POAM
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePoamDto }) =>
      poamApi.updatePoam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Update POAM status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      poamApi.updatePoamStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Delete POAM
  const deleteMutation = useMutation({
    mutationFn: (id: number) => poamApi.deletePoam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Add milestone
  const addMilestoneMutation = useMutation({
    mutationFn: ({ poamId, data }: { poamId: number; data: CreateMilestoneDto }) =>
      poamApi.addMilestone(poamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  // Complete milestone
  const completeMilestoneMutation = useMutation({
    mutationFn: ({ poamId, milestoneId }: { poamId: number; milestoneId: number }) =>
      poamApi.completeMilestone(poamId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  // Delete milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ poamId, milestoneId }: { poamId: number; milestoneId: number }) =>
      poamApi.deleteMilestone(poamId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  return {
    poams,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
    createPoam: createMutation.mutateAsync,
    updatePoam: updateMutation.mutateAsync,
    updatePoamStatus: updateStatusMutation.mutateAsync,
    deletePoam: deleteMutation.mutateAsync,
    addMilestone: addMilestoneMutation.mutateAsync,
    completeMilestone: completeMilestoneMutation.mutateAsync,
    deleteMilestone: deleteMilestoneMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

---

## Step 2: POAM Statistics Card Component

📁 `/client/src/components/poam/POAMStatsCards.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import {
  Assignment,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
} from '@mui/icons-material';
import { PoamStats } from '../../types/poam.types';

interface POAMStatsCardsProps {
  stats: PoamStats | undefined;
}

export const POAMStatsCards: React.FC<POAMStatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total POAMs',
      value: stats.total,
      icon: <Assignment sx={{ fontSize: 40, color: '#90CAF9' }} />,
      color: '#90CAF9',
    },
    {
      title: 'In Progress',
      value: stats.byStatus['In Progress'],
      icon: <Schedule sx={{ fontSize: 40, color: '#FFA726' }} />,
      color: '#FFA726',
    },
    {
      title: 'Completed',
      value: stats.byStatus.Completed,
      icon: <CheckCircle sx={{ fontSize: 40, color: '#66BB6A' }} />,
      color: '#66BB6A',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: <Warning sx={{ fontSize: 40, color: '#F44336' }} />,
      color: '#F44336',
    },
    {
      title: 'Completed This Month',
      value: stats.completedThisMonth,
      icon: <TrendingUp sx={{ fontSize: 40, color: '#42A5F5' }} />,
      color: '#42A5F5',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={2.4} key={card.title}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#242424',
              borderLeft: `4px solid ${card.color}`,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.title}
                </Typography>
              </Box>
              {card.icon}
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
```

---

## Step 3: Main POAM Manager Page

📁 `/client/src/pages/POAMManager.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { usePOAMs } from '../hooks/usePOAMs';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { POAMList } from '../components/poam/POAMList';
import { POAMForm } from '../components/poam/POAMForm';
import { POAMDetailDialog } from '../components/poam/POAMDetailDialog';
import { POAMFilters } from '../components/poam/POAMFilters';
import { POAMStatsCards } from '../components/poam/POAMStatsCards';
import {
  PoamWithControl,
  CreatePoamDto,
  UpdatePoamDto,
  CreateMilestoneDto,
} from '../types/poam.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const POAMManager: React.FC = () => {
  const {
    poams,
    stats,
    isLoading,
    filters,
    setFilters,
    createPoam,
    updatePoam,
    deletePoam,
    addMilestone,
    completeMilestone,
    deleteMilestone,
  } = usePOAMs();

  // Fetch controls for form dropdown
  const { data: controls = [] } = useQuery({
    queryKey: ['controls'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/controls`);
      return response.data;
    },
  });

  // UI State
  const [formOpen, setFormOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPoam, setSelectedPoam] = useState<PoamWithControl | null>(null);
  const [editingPoam, setEditingPoam] = useState<PoamWithControl | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Handlers
  const handleCreateClick = () => {
    setEditingPoam(null);
    setFormOpen(true);
  };

  const handleEditClick = (poam: PoamWithControl) => {
    setEditingPoam(poam);
    setDetailDialogOpen(false);
    setFormOpen(true);
  };

  const handleViewClick = (poam: PoamWithControl) => {
    setSelectedPoam(poam);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = (poam: PoamWithControl) => {
    setSelectedPoam(poam);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreatePoamDto | UpdatePoamDto) => {
    try {
      if (editingPoam) {
        await updatePoam({ id: editingPoam.id, data: data as UpdatePoamDto });
        setSnackbar({
          open: true,
          message: 'POAM updated successfully',
          severity: 'success',
        });
      } else {
        await createPoam(data as CreatePoamDto);
        setSnackbar({
          open: true,
          message: 'POAM created successfully',
          severity: 'success',
        });
      }
      setFormOpen(false);
      setEditingPoam(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Operation failed',
        severity: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPoam) return;

    try {
      await deletePoam(selectedPoam.id);
      setSnackbar({
        open: true,
        message: 'POAM deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedPoam(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Delete failed',
        severity: 'error',
      });
    }
  };

  const handleAddMilestone = async (poamId: number, data: CreateMilestoneDto) => {
    try {
      await addMilestone({ poamId, data });
      setSnackbar({
        open: true,
        message: 'Milestone added successfully',
        severity: 'success',
      });
      // Refresh selected POAM
      const updated = poams.find((p) => p.id === poamId);
      if (updated) setSelectedPoam(updated);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to add milestone',
        severity: 'error',
      });
    }
  };

  const handleCompleteMilestone = async (poamId: number, milestoneId: number) => {
    try {
      await completeMilestone({ poamId, milestoneId });
      setSnackbar({
        open: true,
        message: 'Milestone marked as complete',
        severity: 'success',
      });
      const updated = poams.find((p) => p.id === poamId);
      if (updated) setSelectedPoam(updated);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to complete milestone',
        severity: 'error',
      });
    }
  };

  const handleDeleteMilestone = async (poamId: number, milestoneId: number) => {
    try {
      await deleteMilestone({ poamId, milestoneId });
      setSnackbar({
        open: true,
        message: 'Milestone deleted successfully',
        severity: 'success',
      });
      const updated = poams.find((p) => p.id === poamId);
      if (updated) setSelectedPoam(updated);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete milestone',
        severity: 'error',
      });
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
            Plan of Action & Milestones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage remediation plans for compliance gaps
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateClick}
          size="large"
        >
          Create POAM
        </Button>
      </Box>

      {/* Statistics Cards */}
      <POAMStatsCards stats={stats} />

      {/* Filters */}
      <POAMFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* POAM List */}
      <POAMList
        poams={poams}
        onView={handleViewClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* POAM Form Dialog */}
      <POAMForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPoam(null);
        }}
        onSubmit={handleFormSubmit}
        editPoam={editingPoam}
        controls={controls}
      />

      {/* POAM Detail Dialog */}
      <POAMDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        poam={selectedPoam}
        onAddMilestone={handleAddMilestone}
        onCompleteMilestone={handleCompleteMilestone}
        onDeleteMilestone={handleDeleteMilestone}
        onEdit={() => handleEditClick(selectedPoam!)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#242424' } }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this POAM? This action cannot be undone.
            All associated milestones will also be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
```

---

## Step 4: Add Route to App

📁 `/client/src/App.tsx`

🔍 **FIND:**
```typescript
// Existing route imports
import { ControlLibrary } from './pages/ControlLibrary';
import { Dashboard } from './pages/Dashboard';
// ... other imports
```

✏️ **ADD:**
```typescript
import { POAMManager } from './pages/POAMManager';
```

🔍 **FIND in Routes:**
```tsx
<Route path="/controls" element={<ControlLibrary />} />
<Route path="/dashboard" element={<Dashboard />} />
```

✏️ **ADD:**
```tsx
<Route path="/poams" element={<POAMManager />} />
```

---

## Step 5: Add Navigation Link

📁 `/client/src/components/layout/Sidebar.tsx` (or wherever nav is)

🔍 **FIND:**
```tsx
const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Controls', icon: <Security />, path: '/controls' },
  // ... other items
];
```

✏️ **ADD:**
```tsx
import { Assignment } from '@mui/icons-material';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Controls', icon: <Security />, path: '/controls' },
  { text: 'POAMs', icon: <Assignment />, path: '/poams' },
  // ... other items
];
```

---

## Step 6: Install Required Dependencies (if not already installed)

```bash
cd client
npm install date-fns
npm install @tanstack/react-query
```

---

## Step 7: Testing Checklist

Manual testing steps:

- [ ] Navigate to `/poams` route
- [ ] Verify statistics cards display correctly
- [ ] Test creating a new POAM
- [ ] Test editing an existing POAM
- [ ] Test deleting a POAM
- [ ] Test filtering POAMs by status
- [ ] Test filtering POAMs by priority
- [ ] Test filtering overdue POAMs
- [ ] Test viewing POAM details
- [ ] Test adding a milestone
- [ ] Test completing a milestone
- [ ] Test deleting a milestone
- [ ] Verify overdue POAMs show warning indicator
- [ ] Verify pagination works
- [ ] Test form validation errors
- [ ] Test snackbar notifications

---

## Completion Criteria

✅ All components render without errors
✅ CRUD operations work for POAMs
✅ Milestone management works
✅ Filters apply correctly
✅ Statistics update in real-time
✅ Dark theme styling is consistent
✅ Loading states display properly
✅ Error handling shows user-friendly messages
✅ Responsive layout works on different screen sizes

---

## Common Issues & Solutions

### Issue: React Query not working
**Solution:** Ensure QueryClientProvider is set up in App.tsx or main.tsx

### Issue: Date formatting errors
**Solution:** Verify date-fns is installed and dates are in ISO format

### Issue: Controls dropdown empty
**Solution:** Check that controls API endpoint returns data

### Issue: Milestones not refreshing
**Solution:** Ensure React Query cache invalidation is working

---

## Next Steps

Phase 4 is now complete! The POAM management system is fully functional. You can now:

1. **Integrate with Dashboard** - Add POAM statistics to the main dashboard
2. **Add Export Feature** - Generate POAM reports (PDF/Excel)
3. **Add Notifications** - Email reminders for overdue POAMs
4. **Add Bulk Operations** - Bulk status updates, bulk delete
5. **Move to Phase 5** - Evidence Management

---

## Performance Optimization Tips

- Use React.memo for list items if list grows large (>100 POAMs)
- Implement virtual scrolling for very large lists
- Consider debouncing filter inputs
- Add caching for control lookup data
