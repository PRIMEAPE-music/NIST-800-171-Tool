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
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { controlService, Control } from '@/services/controlService';
import { ControlStatus } from '@/types/enums';

interface StatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  control: Control;
  onSuccess: () => void;
}

export const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  open,
  onClose,
  control,
  onSuccess,
}) => {
  const [status, setStatus] = useState<string>('');
  const [implementationDate, setImplementationDate] = useState<string>('');

  useEffect(() => {
    if (control?.status) {
      setStatus(control.status.status || '');
      setImplementationDate(
        control.status.implementationDate
          ? new Date(control.status.implementationDate).toISOString().split('T')[0]
          : ''
      );
    }
  }, [control]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => controlService.updateControlStatus(control.id, data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      status,
      implementationDate: implementationDate || undefined,
      lastReviewedDate: new Date().toISOString(),
    });
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#242424',
          color: '#E0E0E0',
        },
      }}
    >
      <DialogTitle sx={{ color: '#E0E0E0' }}>
        Update Status - {control?.controlId}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel sx={{ color: '#B0B0B0' }}>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              label="Status"
              sx={{
                color: '#E0E0E0',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4A4A4A' },
                '& .MuiSvgIcon-root': { color: '#B0B0B0' },
              }}
            >
              {Object.values(ControlStatus).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {(status === 'Implemented' || status === 'Verified') && (
            <TextField
              fullWidth
              type="date"
              label="Implementation Date"
              value={implementationDate}
              onChange={(e) => setImplementationDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-root': { color: '#E0E0E0' },
                '& .MuiInputLabel-root': { color: '#B0B0B0' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4A4A4A' },
              }}
            />
          )}

          {updateMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to update status. Please try again.
            </Alert>
          )}

          <Typography
            variant="caption"
            sx={{ mt: 2, display: 'block', color: '#B0B0B0' }}
          >
            Last reviewed date will be automatically updated to today.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={updateMutation.isPending} sx={{ color: '#B0B0B0' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!status || updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusUpdateDialog;
