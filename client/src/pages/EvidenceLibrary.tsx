import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FileUpload } from '../components/evidence/FileUpload';
import { EvidenceCard } from '../components/evidence/EvidenceCard';
import { useEvidence, useDeleteEvidence } from '../hooks/useEvidence';
import { EvidenceFilters } from '../types/evidence.types';

export const EvidenceLibrary: React.FC = () => {
  const [filters] = useState<EvidenceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState<number>(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<number | null>(null);

  const { data: evidence, isLoading, error, refetch } = useEvidence(filters);
  const deleteMutation = useDeleteEvidence();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleDeleteClick = (id: number) => {
    setEvidenceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (evidenceToDelete) {
      try {
        await deleteMutation.mutateAsync(evidenceToDelete);
        setDeleteConfirmOpen(false);
        setEvidenceToDelete(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const filteredEvidence = evidence?.filter(item =>
    item.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.control?.controlId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Evidence Library
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Evidence
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by filename or control ID..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load evidence: {error.message}
        </Alert>
      )}

      {/* Evidence Grid */}
      {filteredEvidence && (
        <Grid container spacing={3}>
          {filteredEvidence.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No evidence files found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upload your first evidence file to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                  sx={{ mt: 3 }}
                >
                  Upload Evidence
                </Button>
              </Paper>
            </Grid>
          ) : (
            filteredEvidence.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <EvidenceCard
                  evidence={item}
                  onDelete={handleDeleteClick}
                />
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Evidence</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Control ID"
              type="number"
              value={selectedControlId || ''}
              onChange={(e) => setSelectedControlId(parseInt(e.target.value) || 0)}
              sx={{ mb: 2 }}
            />
          </Box>
          {selectedControlId > 0 && (
            <FileUpload
              controlId={selectedControlId}
              onUploadComplete={() => {
                setUploadDialogOpen(false);
                setSelectedControlId(0);
                refetch();
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this evidence file? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
