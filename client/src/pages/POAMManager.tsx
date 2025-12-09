import React, { useState, useMemo } from 'react';
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
import { BulkActionsToolbar } from '../components/poam/BulkActionsToolbar';
import { POAMTabs } from '../components/poam/POAMTabs';
import { BulkStatusUpdateDialog } from '../components/poam/BulkStatusUpdateDialog';
import {
  PoamWithControl,
  CreatePoamDto,
  UpdatePoamDto,
  CreateMilestoneDto,
} from '../types/poam.types';
import { poamApi, downloadBlob } from '../services/poam.api';

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

  // New state for tabs and bulk operations
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedPoamIds, setSelectedPoamIds] = useState<number[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Filter POAMs by tab
  const filteredPoams = useMemo(() => {
    if (activeTab === 'completed') {
      return poams.filter((p) => p.status === 'Completed');
    } else {
      return poams.filter((p) => p.status !== 'Completed');
    }
  }, [poams, activeTab]);

  // Calculate counts for tabs
  const activeCount = poams.filter((p) => p.status !== 'Completed').length;
  const completedCount = poams.filter((p) => p.status === 'Completed').length;

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
      // Fetch fresh POAM data
      const freshPoam = await poamApi.getPoamById(poamId);
      setSelectedPoam(freshPoam);
      if (editingPoam?.id === poamId) {
        setEditingPoam(freshPoam);
      }
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
      // Fetch fresh POAM data
      const freshPoam = await poamApi.getPoamById(poamId);
      setSelectedPoam(freshPoam);
      if (editingPoam?.id === poamId) {
        setEditingPoam(freshPoam);
      }
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
      // Fetch fresh POAM data
      const freshPoam = await poamApi.getPoamById(poamId);
      setSelectedPoam(freshPoam);
      if (editingPoam?.id === poamId) {
        setEditingPoam(freshPoam);
      }
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

  // New handlers for uncomplete milestone
  const handleUncompleteMilestone = async (poamId: number, milestoneId: number) => {
    try {
      await poamApi.uncompleteMilestone(poamId, milestoneId);
      setSnackbar({
        open: true,
        message: 'Milestone unmarked successfully',
        severity: 'success',
      });
      // Fetch fresh POAM data
      const freshPoam = await poamApi.getPoamById(poamId);
      setSelectedPoam(freshPoam);
      if (editingPoam?.id === poamId) {
        setEditingPoam(freshPoam);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to uncomplete milestone',
        severity: 'error',
      });
    }
  };

  // Export handlers
  const handleExportPdf = async () => {
    try {
      const blob = await poamApi.exportBulkPdf(selectedPoamIds);
      downloadBlob(blob, `POAMs_Export_${Date.now()}.zip`);
      setSnackbar({
        open: true,
        message: `Successfully exported ${selectedPoamIds.length} POAM(s) as PDF`,
        severity: 'success',
      });
      setSelectedPoamIds([]);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to export PDFs',
        severity: 'error',
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await poamApi.exportExcel(selectedPoamIds);
      downloadBlob(blob, `POAMs_Export_${Date.now()}.xlsx`);
      setSnackbar({
        open: true,
        message: `Successfully exported ${selectedPoamIds.length} POAM(s) to Excel`,
        severity: 'success',
      });
      setSelectedPoamIds([]);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to export Excel',
        severity: 'error',
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await poamApi.exportCsv(selectedPoamIds);
      downloadBlob(blob, `POAMs_Export_${Date.now()}.csv`);
      setSnackbar({
        open: true,
        message: `Successfully exported ${selectedPoamIds.length} POAM(s) to CSV`,
        severity: 'success',
      });
      setSelectedPoamIds([]);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to export CSV',
        severity: 'error',
      });
    }
  };

  // Bulk operations handlers
  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const result = await poamApi.bulkUpdateStatus(selectedPoamIds, newStatus);
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      });
      setSelectedPoamIds([]);
      setBulkStatusDialogOpen(false);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to update POAMs',
        severity: 'error',
      });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      const result = await poamApi.bulkDelete(selectedPoamIds);
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      });
      setSelectedPoamIds([]);
      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete POAMs',
        severity: 'error',
      });
    }
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

      {/* Tabs */}
      <POAMTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={activeCount}
        completedCount={completedCount}
      />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedPoamIds.length}
        onClearSelection={() => setSelectedPoamIds([])}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onBulkStatusUpdate={() => setBulkStatusDialogOpen(true)}
        onBulkDelete={() => setBulkDeleteDialogOpen(true)}
      />

      {/* Filters */}
      <POAMFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* POAM List */}
      <POAMList
        poams={filteredPoams}
        onView={handleViewClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        selectedIds={selectedPoamIds}
        onSelectionChange={setSelectedPoamIds}
        showCheckboxes={true}
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
        onAddMilestone={handleAddMilestone}
        onCompleteMilestone={handleCompleteMilestone}
        onDeleteMilestone={handleDeleteMilestone}
        onUncompleteMilestone={handleUncompleteMilestone}
      />

      {/* POAM Detail Dialog */}
      <POAMDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        poam={selectedPoam}
        onAddMilestone={handleAddMilestone}
        onCompleteMilestone={handleCompleteMilestone}
        onDeleteMilestone={handleDeleteMilestone}
        onUncompleteMilestone={handleUncompleteMilestone}
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

      {/* Bulk Status Update Dialog */}
      <BulkStatusUpdateDialog
        open={bulkStatusDialogOpen}
        onClose={() => setBulkStatusDialogOpen(false)}
        selectedCount={selectedPoamIds.length}
        onConfirm={handleBulkStatusUpdate}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#242424' } }}
      >
        <DialogTitle>Confirm Bulk Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedPoamIds.length} POAM(s)? This action
            cannot be undone. All associated milestones will also be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
            Delete {selectedPoamIds.length} POAM(s)
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
