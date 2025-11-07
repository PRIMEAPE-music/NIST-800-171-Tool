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
