import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Control } from '@/services/controlService';
import { FileUpload } from '@/components/evidence/FileUpload';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import {
  useEvidenceForControl,
  useDeleteEvidence,
} from '@/hooks/useEvidence';

interface EvidenceTabProps {
  control: Control;
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({ control }) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<number | null>(null);

  // Fetch evidence for this specific control
  const {
    data: evidence = [],
    isLoading,
    error,
    refetch,
  } = useEvidenceForControl(control.id);

  // Delete mutation
  const deleteMutation = useDeleteEvidence();

  const handleDeleteClick = (id: number): void => {
    setEvidenceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (evidenceToDelete) {
      try {
        await deleteMutation.mutateAsync(evidenceToDelete);
        setDeleteConfirmOpen(false);
        setEvidenceToDelete(null);
      } catch (err) {
        console.error('Failed to delete evidence:', err);
      }
    }
  };

  const handleUploadComplete = (): void => {
    setUploadDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ px: 3 }}>
        <Alert severity="error">
          Failed to load evidence: {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
          Evidence & Documentation
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size="small"
            sx={{
              color: '#90CAF9',
              borderColor: '#90CAF9',
              '&:hover': {
                borderColor: '#64B5F6',
                backgroundColor: 'rgba(144, 202, 249, 0.08)',
              },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            size="small"
            sx={{
              backgroundColor: '#90CAF9',
              color: '#121212',
              '&:hover': {
                backgroundColor: '#64B5F6',
              },
            }}
          >
            Upload Evidence
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Evidence Grid or Empty State */}
      {evidence.length === 0 ? (
        <Paper
          sx={{
            py: 8,
            textAlign: 'center',
            backgroundColor: '#1E1E1E',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <UploadIcon sx={{ fontSize: 64, color: '#757575', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#E0E0E0' }} gutterBottom>
            No Evidence Files
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
            Upload documentation, screenshots, or policies to support this
            control
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              backgroundColor: '#90CAF9',
              color: '#121212',
              '&:hover': {
                backgroundColor: '#64B5F6',
              },
            }}
          >
            Upload First Evidence File
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {evidence.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <EvidenceCard evidence={item} onDelete={handleDeleteClick} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#242424',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ color: '#E0E0E0' }}>
          Upload Evidence for {control.controlId}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
            {control.title}
          </Typography>
          <FileUpload
            controlId={control.id}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            sx={{ color: '#B0B0B0' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#242424',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ color: '#E0E0E0' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#B0B0B0' }}>
            Are you sure you want to delete this evidence file? This action
            cannot be undone and will permanently remove the file from the
            system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ color: '#B0B0B0' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EvidenceTab;
