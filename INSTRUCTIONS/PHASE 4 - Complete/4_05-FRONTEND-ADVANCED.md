# Phase 4 Part 4: Advanced Frontend Components

## Objective
Build complex POAM management components: forms, milestone tracker, detail dialog, and main page.

---

## Step 1: Milestone Tracker Component

📁 `/client/src/components/poam/MilestoneTracker.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React, { useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Add,
  Delete,
  Edit,
  AccessTime,
} from '@mui/icons-material';
import { PoamMilestone, CreateMilestoneDto } from '../../types/poam.types';
import { format, isPast } from 'date-fns';

interface MilestoneTrackerProps {
  milestones: PoamMilestone[];
  poamId: number;
  onAddMilestone: (data: CreateMilestoneDto) => Promise<void>;
  onCompleteMilestone: (milestoneId: number) => Promise<void>;
  onDeleteMilestone: (milestoneId: number) => Promise<void>;
  readOnly?: boolean;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  poamId,
  onAddMilestone,
  onCompleteMilestone,
  onDeleteMilestone,
  readOnly = false,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    description: '',
    dueDate: '',
  });

  const completedCount = milestones.filter((m) => m.status === 'Completed').length;
  const totalCount = milestones.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddMilestone = async () => {
    if (newMilestone.description && newMilestone.dueDate) {
      await onAddMilestone({
        milestoneDescription: newMilestone.description,
        dueDate: new Date(newMilestone.dueDate).toISOString(),
      });
      setNewMilestone({ description: '', dueDate: '' });
      setAddDialogOpen(false);
    }
  };

  const getStatusColor = (milestone: PoamMilestone) => {
    if (milestone.status === 'Completed') return '#66BB6A';
    if (isPast(new Date(milestone.dueDate))) return '#F44336';
    return '#FFA726';
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
          Milestones
        </Typography>
        {!readOnly && (
          <Button
            startIcon={<Add />}
            variant="outlined"
            size="small"
            onClick={() => setAddDialogOpen(true)}
          >
            Add Milestone
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Progress: {completedCount} of {totalCount} completed
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {Math.round(progress)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#1E1E1E',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#66BB6A',
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {milestones.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            bgcolor: '#1E1E1E',
            borderRadius: 1,
          }}
        >
          <Typography color="text.secondary">
            No milestones yet. Add one to track progress.
          </Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: '#1E1E1E', borderRadius: 1 }}>
          {milestones
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map((milestone, index) => (
              <ListItem
                key={milestone.id}
                sx={{
                  borderBottom:
                    index < milestones.length - 1
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : 'none',
                }}
                secondaryAction={
                  !readOnly && (
                    <Box>
                      {milestone.status !== 'Completed' && (
                        <IconButton
                          edge="end"
                          onClick={() => onCompleteMilestone(milestone.id)}
                          sx={{ color: '#66BB6A' }}
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton
                        edge="end"
                        onClick={() => onDeleteMilestone(milestone.id)}
                        sx={{ color: '#F44336' }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemIcon>
                  {milestone.status === 'Completed' ? (
                    <CheckCircle sx={{ color: '#66BB6A' }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ color: getStatusColor(milestone) }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        sx={{
                          textDecoration:
                            milestone.status === 'Completed' ? 'line-through' : 'none',
                          color: milestone.status === 'Completed' ? '#B0B0B0' : '#E0E0E0',
                        }}
                      >
                        {milestone.milestoneDescription}
                      </Typography>
                      {isPast(new Date(milestone.dueDate)) &&
                        milestone.status !== 'Completed' && (
                          <Chip
                            label="Overdue"
                            size="small"
                            sx={{
                              bgcolor: '#F44336',
                              color: '#FFF',
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <AccessTime sx={{ fontSize: 14, color: '#B0B0B0' }} />
                      <Typography variant="caption" color="text.secondary">
                        Due: {format(new Date(milestone.dueDate), 'MMM dd, yyyy')}
                      </Typography>
                      {milestone.completionDate && (
                        <Typography variant="caption" color="text.secondary">
                          • Completed:{' '}
                          {format(new Date(milestone.completionDate), 'MMM dd, yyyy')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
        </List>
      )}

      {/* Add Milestone Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#242424' },
        }}
      >
        <DialogTitle>Add Milestone</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Milestone Description"
            value={newMilestone.description}
            onChange={(e) =>
              setNewMilestone({ ...newMilestone, description: e.target.value })
            }
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={newMilestone.dueDate}
            onChange={(e) =>
              setNewMilestone({ ...newMilestone, dueDate: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddMilestone}
            variant="contained"
            disabled={!newMilestone.description || !newMilestone.dueDate}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

---

## Step 2: POAM Form Component

📁 `/client/src/components/poam/POAMForm.tsx`

🔄 **CREATE NEW FILE:**

```typescript
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
  Typography,
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
```

---

## Step 3: POAM Detail Dialog

📁 `/client/src/components/poam/POAMDetailDialog.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Grid,
  Chip,
} from '@mui/material';
import { POAMStatusChip } from './POAMStatusChip';
import { POAMPriorityChip } from './POAMPriorityChip';
import { MilestoneTracker } from './MilestoneTracker';
import { PoamWithControl, CreateMilestoneDto } from '../../types/poam.types';
import { format } from 'date-fns';

interface POAMDetailDialogProps {
  open: boolean;
  onClose: () => void;
  poam: PoamWithControl | null;
  onAddMilestone: (poamId: number, data: CreateMilestoneDto) => Promise<void>;
  onCompleteMilestone: (poamId: number, milestoneId: number) => Promise<void>;
  onDeleteMilestone: (poamId: number, milestoneId: number) => Promise<void>;
  onEdit: () => void;
}

export const POAMDetailDialog: React.FC<POAMDetailDialogProps> = ({
  open,
  onClose,
  poam,
  onAddMilestone,
  onCompleteMilestone,
  onDeleteMilestone,
  onEdit,
}) => {
  if (!poam) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { bgcolor: '#242424', maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">POAM Details</Typography>
          <Box display="flex" gap={1}>
            <POAMStatusChip status={poam.status} size="medium" />
            <POAMPriorityChip priority={poam.priority} size="medium" />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Control Information */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Associated Control
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: '#1E1E1E',
                borderRadius: 1,
                borderLeft: '4px solid #90CAF9',
              }}
            >
              <Typography variant="h6" sx={{ color: '#90CAF9' }}>
                {poam.control.controlId}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {poam.control.title}
              </Typography>
              <Chip
                label={poam.control.family}
                size="small"
                sx={{ mt: 1, bgcolor: '#2C2C2C' }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Gap Description */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Gap Description
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {poam.gapDescription}
            </Typography>
          </Box>

          {/* Remediation Plan */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Remediation Plan
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {poam.remediationPlan}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Metadata Grid */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Assigned To
              </Typography>
              <Typography variant="body1">
                {poam.assignedTo || 'Not assigned'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Budget Estimate
              </Typography>
              <Typography variant="body1">
                {poam.budgetEstimate
                  ? `$${poam.budgetEstimate.toLocaleString()}`
                  : 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Start Date
              </Typography>
              <Typography variant="body1">
                {poam.startDate
                  ? format(new Date(poam.startDate), 'MMMM dd, yyyy')
                  : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Target Completion Date
              </Typography>
              <Typography variant="body1">
                {poam.targetCompletionDate
                  ? format(new Date(poam.targetCompletionDate), 'MMMM dd, yyyy')
                  : 'Not set'}
              </Typography>
            </Grid>
            {poam.actualCompletionDate && (
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Actual Completion Date
                </Typography>
                <Typography variant="body1" sx={{ color: '#66BB6A' }}>
                  {format(new Date(poam.actualCompletionDate), 'MMMM dd, yyyy')}
                </Typography>
              </Grid>
            )}
            {poam.resourcesRequired && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Resources Required
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {poam.resourcesRequired}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Milestones */}
          <MilestoneTracker
            milestones={poam.milestones}
            poamId={poam.id}
            onAddMilestone={(data) => onAddMilestone(poam.id, data)}
            onCompleteMilestone={(milestoneId) =>
              onCompleteMilestone(poam.id, milestoneId)
            }
            onDeleteMilestone={(milestoneId) =>
              onDeleteMilestone(poam.id, milestoneId)
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onEdit} variant="contained">
          Edit POAM
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## Completion Checklist

- [ ] Milestone tracker with progress visualization
- [ ] POAM form with validation
- [ ] POAM detail dialog with full information
- [ ] Status and priority chips
- [ ] Filter controls
- [ ] POAM list with pagination

---

## Next Steps
Proceed to **05-MAIN-PAGE.md** to create the POAMManager page that ties everything together.
