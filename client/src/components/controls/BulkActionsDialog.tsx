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
  Radio,
  Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { controlService } from '@/services/controlService';
import { ControlStatus } from '@/types/enums';

interface BulkActionsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedControlIds: number[];
  onSuccess: () => void;
}

export const BulkActionsDialog: React.FC<BulkActionsDialogProps> = ({
  open,
  onClose,
  selectedControlIds,
  onSuccess,
}) => {
  const [operation, setOperation] = useState<'updateStatus' | 'assign'>('updateStatus');
  const [status, setStatus] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: any) => controlService.bulkUpdate(data),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      onSuccess();
      handleClose();
    },
  });

  const handleClose = () => {
    setOperation('updateStatus');
    setStatus('');
    setAssignedTo('');
    onClose();
  };

  const handleSubmit = () => {
    const data = operation === 'updateStatus' ? { status } : { assignedTo };

    bulkUpdateMutation.mutate({
      controlIds: selectedControlIds,
      operation,
      data,
    });
  };

  const isValid = operation === 'updateStatus' ? status !== '' : assignedTo !== '';

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
                control={<Radio sx={{ color: '#B0B0B0', '&.Mui-checked': { color: '#90CAF9' } }} />}
                label={<Typography sx={{ color: '#E0E0E0' }}>Update Status</Typography>}
              />
              <FormControlLabel
                value="assign"
                control={<Radio sx={{ color: '#B0B0B0', '&.Mui-checked': { color: '#90CAF9' } }} />}
                label={<Typography sx={{ color: '#E0E0E0' }}>Assign To User</Typography>}
              />
            </RadioGroup>
          </FormControl>

          <Box sx={{ mt: 3 }}>
            {operation === 'updateStatus' ? (
              <FormControl fullWidth>
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
            ) : (
              <TextField
                fullWidth
                label="Assigned To"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter name or email"
                sx={{
                  '& .MuiInputBase-root': { color: '#E0E0E0' },
                  '& .MuiInputLabel-root': { color: '#B0B0B0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4A4A4A' },
                }}
              />
            )}
          </Box>

          {bulkUpdateMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to update controls. Please try again.
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            This action will update all {selectedControlIds.length} selected controls.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: '#B0B0B0' }}>
          Cancel
        </Button>
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
