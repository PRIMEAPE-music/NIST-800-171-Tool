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
