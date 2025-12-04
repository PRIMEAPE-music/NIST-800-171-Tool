import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface ManualComplianceDialogProps {
  open: boolean;
  onClose: () => void;
  settingId: number;
  policyId: number;
  controlId?: number;
  settingName: string;
  currentStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | null;
  currentRationale: string;
  onSaved: () => void;
}

const ManualComplianceDialog: React.FC<ManualComplianceDialogProps> = ({
  open,
  onClose,
  settingId,
  policyId,
  controlId,
  settingName,
  currentStatus,
  currentRationale,
  onSaved,
}) => {
  const [complianceStatus, setComplianceStatus] = useState<'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | ''>('');
  const [rationale, setRationale] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with current values
  useEffect(() => {
    if (open) {
      setComplianceStatus(currentStatus || '');
      setRationale(currentRationale || '');
      setFiles([]);
      setError(null);
      setSuccess(false);
    }
  }, [open, currentStatus, currentRationale]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validation
    if (!complianceStatus) {
      setError('Please select a compliance status');
      return;
    }

    if (!rationale.trim()) {
      setError('Please provide a rationale for this review');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // First, save the review
      const reviewResponse = await axios.post('/api/manual-reviews', {
        settingId,
        policyId,
        controlId,
        isReviewed: true,
        manualComplianceStatus: complianceStatus,
        rationale: rationale.trim(),
      });

      if (!reviewResponse.data.success) {
        throw new Error(reviewResponse.data.error || 'Failed to save review');
      }

      const reviewId = reviewResponse.data.review.id;

      // If there are files, upload them
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        try {
          await axios.post(`/api/manual-reviews/${reviewId}/evidence`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (uploadError) {
          console.error('Error uploading evidence files:', uploadError);
          // Don't fail the whole operation if file upload fails
          // The review is already saved
        }
      }

      setSuccess(true);

      // Call the onSaved callback to refresh the parent data
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving manual review:', err);
      setError(err instanceof Error ? err.message : 'Failed to save review');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Manual Compliance Review</Typography>
          <IconButton onClick={handleClose} disabled={uploading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Setting Name */}
        <Box mb={3}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Setting:
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {settingName}
          </Typography>
        </Box>

        {/* Success Message */}
        {success && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 2 }}
          >
            Review saved successfully!
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Compliance Status */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="compliance-status-label">Compliance Status *</InputLabel>
          <Select
            labelId="compliance-status-label"
            id="compliance-status"
            value={complianceStatus}
            label="Compliance Status *"
            onChange={(e) => setComplianceStatus(e.target.value as 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT')}
            disabled={uploading || success}
          >
            <MenuItem value="COMPLIANT">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Compliant" size="small" color="success" />
                <Typography variant="body2">Fully meets requirements</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="PARTIAL">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Partial" size="small" color="warning" />
                <Typography variant="body2">Partially meets requirements</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="NON_COMPLIANT">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Non-Compliant" size="small" color="error" />
                <Typography variant="body2">Does not meet requirements</Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Rationale */}
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Rationale *"
          placeholder="Explain why this setting is compliant, partially compliant, or non-compliant..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          disabled={uploading || success}
          sx={{ mb: 3 }}
          helperText="Provide a clear explanation for your compliance determination"
        />

        {/* File Upload */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Evidence Files (Optional)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Upload screenshots or documents to support your review
          </Typography>

          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            disabled={uploading || success}
            sx={{ mb: 2 }}
          >
            Choose Files
            <input
              type="file"
              hidden
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />
          </Button>

          {/* File List */}
          {files.length > 0 && (
            <List dense>
              {files.map((file, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024).toFixed(2)} KB`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploading || success}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={uploading || success || !complianceStatus || !rationale.trim()}
          startIcon={uploading ? <CircularProgress size={20} /> : null}
        >
          {uploading ? 'Saving...' : 'Save Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualComplianceDialog;
