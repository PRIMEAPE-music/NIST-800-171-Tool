import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Autocomplete,
} from '@mui/material';
import { CreatePoamDto, UpdatePoamDto, PoamWithControl } from '../../types/poam.types';

interface POAMFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePoamDto | UpdatePoamDto) => Promise<void>;
  editPoam?: PoamWithControl | null;
  controls: Array<{ id: number; controlId: string; title: string; family: string }>;
}

export const POAMForm: React.FC<POAMFormProps> = ({
  open,
  onClose,
  onSubmit,
  editPoam,
  controls,
}) => {
  const [formData, setFormData] = useState<any>({
    controlId: '',
    gapDescription: '',
    remediationPlan: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'Open',
    startDate: '',
    targetCompletionDate: '',
    resourcesRequired: '',
    budgetEstimate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editPoam) {
      setFormData({
        controlId: editPoam.controlId,
        gapDescription: editPoam.gapDescription,
        remediationPlan: editPoam.remediationPlan,
        assignedTo: editPoam.assignedTo || '',
        priority: editPoam.priority,
        status: editPoam.status,
        startDate: editPoam.startDate
          ? new Date(editPoam.startDate).toISOString().split('T')[0]
          : '',
        targetCompletionDate: editPoam.targetCompletionDate
          ? new Date(editPoam.targetCompletionDate).toISOString().split('T')[0]
          : '',
        resourcesRequired: editPoam.resourcesRequired || '',
        budgetEstimate: editPoam.budgetEstimate || '',
      });
    } else {
      // Reset form for new POAM
      setFormData({
        controlId: '',
        gapDescription: '',
        remediationPlan: '',
        assignedTo: '',
        priority: 'Medium',
        status: 'Open',
        startDate: '',
        targetCompletionDate: '',
        resourcesRequired: '',
        budgetEstimate: '',
      });
    }
    setErrors({});
  }, [editPoam, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.controlId) {
      newErrors.controlId = 'Control is required';
    }

    if (formData.gapDescription.length < 10) {
      newErrors.gapDescription = 'Gap description must be at least 10 characters';
    }

    if (formData.remediationPlan.length < 20) {
      newErrors.remediationPlan = 'Remediation plan must be at least 20 characters';
    }

    if (
      formData.startDate &&
      formData.targetCompletionDate &&
      new Date(formData.startDate) > new Date(formData.targetCompletionDate)
    ) {
      newErrors.targetCompletionDate =
        'Target date cannot be before start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: any = {
      ...formData,
      controlId: parseInt(formData.controlId),
      budgetEstimate: formData.budgetEstimate
        ? parseFloat(formData.budgetEstimate)
        : undefined,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      targetCompletionDate: formData.targetCompletionDate
        ? new Date(formData.targetCompletionDate).toISOString()
        : undefined,
    };

    // Remove empty strings
    Object.keys(submitData).forEach((key) => {
      if (submitData[key] === '') {
        delete submitData[key];
      }
    });

    await onSubmit(submitData);
    onClose();
  };

  const selectedControl = controls.find((c) => c.id === parseInt(formData.controlId));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: '#242424' },
      }}
    >
      <DialogTitle>
        {editPoam ? 'Edit POAM' : 'Create New POAM'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* Control Selection */}
          <Autocomplete
            options={controls}
            getOptionLabel={(option) =>
              `${option.controlId} - ${option.title}`
            }
            value={selectedControl || null}
            onChange={(_, newValue) => {
              setFormData({ ...formData, controlId: newValue?.id || '' });
            }}
            disabled={!!editPoam}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Control *"
                error={!!errors.controlId}
                helperText={errors.controlId}
              />
            )}
          />

          {/* Gap Description */}
          <TextField
            fullWidth
            label="Gap Description *"
            multiline
            rows={3}
            value={formData.gapDescription}
            onChange={(e) =>
              setFormData({ ...formData, gapDescription: e.target.value })
            }
            error={!!errors.gapDescription}
            helperText={errors.gapDescription || 'Describe the identified gap or weakness'}
          />

          {/* Remediation Plan */}
          <TextField
            fullWidth
            label="Remediation Plan *"
            multiline
            rows={4}
            value={formData.remediationPlan}
            onChange={(e) =>
              setFormData({ ...formData, remediationPlan: e.target.value })
            }
            error={!!errors.remediationPlan}
            helperText={
              errors.remediationPlan ||
              'Describe the planned actions to address the gap'
            }
          />

          {/* Row 1: Priority, Status, Assigned To */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              >
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Risk Accepted">Risk Accepted</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Assigned To"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
            />
          </Box>

          {/* Row 2: Dates */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Target Completion Date"
              type="date"
              value={formData.targetCompletionDate}
              onChange={(e) =>
                setFormData({ ...formData, targetCompletionDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              error={!!errors.targetCompletionDate}
              helperText={errors.targetCompletionDate}
            />
          </Box>

          {/* Resources Required */}
          <TextField
            fullWidth
            label="Resources Required"
            multiline
            rows={2}
            value={formData.resourcesRequired}
            onChange={(e) =>
              setFormData({ ...formData, resourcesRequired: e.target.value })
            }
            helperText="List personnel, tools, or other resources needed"
          />

          {/* Budget Estimate */}
          <TextField
            fullWidth
            label="Budget Estimate"
            type="number"
            value={formData.budgetEstimate}
            onChange={(e) =>
              setFormData({ ...formData, budgetEstimate: e.target.value })
            }
            InputProps={{ startAdornment: '$' }}
            helperText="Estimated cost for remediation"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {editPoam ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
