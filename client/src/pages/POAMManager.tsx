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
      return response.data.data; // Extract the actual array from the response
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
