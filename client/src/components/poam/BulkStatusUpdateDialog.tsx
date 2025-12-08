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
  Typography,
  Alert,
} from '@mui/material';

interface BulkStatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (newStatus: string) => Promise<void>;
}

export const BulkStatusUpdateDialog: React.FC<BulkStatusUpdateDialogProps> = ({
  open,
  onClose,
  selectedCount,
  onConfirm,
}) => {
  const [newStatus, setNewStatus] = useState<string>('In Progress');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(newStatus);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#242424' } }}
    >
      <DialogTitle>Bulk Status Update</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          You are about to update the status of {selectedCount} POAM
          {selectedCount > 1 ? 's' : ''}.
        </Alert>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={newStatus}
            label="New Status"
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Risk Accepted">Risk Accepted</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This action will update all selected POAMs to the new status.
          {newStatus === 'Completed' &&
            ' Actual completion date will be automatically set for completed POAMs.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : `Update ${selectedCount} POAM${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
