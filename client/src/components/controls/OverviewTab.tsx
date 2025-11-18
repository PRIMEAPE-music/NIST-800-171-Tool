import React from 'react';
import { Box, Typography, TextField, Divider, Paper, LinearProgress, Chip } from '@mui/material';
import { CheckCircle, Schedule, RadioButtonUnchecked } from '@mui/icons-material';
import { Control } from '@/services/controlService';
import { M365CoverageStatus } from './M365CoverageStatus';

interface OverviewTabProps {
  control: Control;
  editMode: boolean;
  localNotes: string;
  onNotesChange: (notes: string) => void;
  onViewM365Tab?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  control,
  editMode,
  localNotes,
  onNotesChange,
  onViewM365Tab,
}) => {
  return (
    <Box sx={{ px: 3, width: '100%', display: 'block' }}>
      {/* Requirement Text */}
      <Box sx={{ mb: 4, width: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Requirement
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: '#1a1a1a',
            borderColor: '#4A4A4A',
            width: '100%',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-line',
              color: '#E0E0E0',
              wordBreak: 'break-word',
            }}
          >
            {control.requirementText}
          </Typography>
        </Paper>
      </Box>

      {/* Discussion/Guidance */}
      {control.discussionText && (
        <Box sx={{ mb: 4, width: '100%', display: 'block' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
            Discussion
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: '#1a1a1a',
              borderColor: '#4A4A4A',
              width: '100%',
              display: 'block',
            }}
          >
            <Typography
              variant="body2"
              component="div"
              sx={{
                whiteSpace: 'pre-line',
                color: '#B0B0B0',
                width: '100%',
                wordBreak: 'break-word',
                maxWidth: 'none',
              }}
            >
              {/* Process text: preserve paragraph breaks (double newlines) but merge single newlines */}
              {control.discussionText
                .replace(/\n\n/g, '<<<PARA>>>')  // Preserve paragraph breaks
                .replace(/\n/g, ' ')              // Convert single newlines to spaces
                .replace(/<<<PARA>>>/g, '\n\n')   // Restore paragraph breaks
                .replace(/  +/g, ' ')             // Collapse multiple spaces
              }
            </Typography>
          </Paper>
        </Box>
      )}

      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Implementation Notes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Implementation Notes
        </Typography>
        {editMode ? (
          <TextField
            fullWidth
            multiline
            rows={8}
            value={localNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Document your implementation approach, configurations, policies, and procedures..."
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: '#1a1a1a',
                color: '#E0E0E0',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4A4A4A',
              },
            }}
          />
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: '#1a1a1a',
              minHeight: 100,
              borderColor: '#4A4A4A',
            }}
          >
            {control.status?.implementationNotes ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#E0E0E0' }}>
                {control.status.implementationNotes}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: '#B0B0B0' }} fontStyle="italic">
                No implementation notes yet. Click "Edit Notes" to add your approach.
              </Typography>
            )}
          </Paper>
        )}
      </Box>

      {/* Metadata */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Metadata
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: '#242424',
            borderColor: '#4A4A4A',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                NIST Revision
              </Typography>
              <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                {control.revision || 'r3'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                Priority Level
              </Typography>
              <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                {control.priority}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                Implementation Date
              </Typography>
              <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                {control.status?.implementationDate
                  ? new Date(control.status.implementationDate).toLocaleDateString()
                  : 'Not implemented'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                Publication Date
              </Typography>
              <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                {control.publicationDate}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* M365 Improvement Actions Progress */}
      {control.improvementActionProgress && control.improvementActionProgress.totalActions > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
            Microsoft 365 Improvement Actions
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              bgcolor: '#1a1a1a',
              borderColor: '#4A4A4A',
            }}
          >
            {/* Progress Bar */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                  Implementation Progress
                </Typography>
                <Typography variant="body2" sx={{
                  color: control.improvementActionProgress.progressPercentage >= 80 ? '#4caf50'
                    : control.improvementActionProgress.progressPercentage >= 50 ? '#ffc107'
                    : control.improvementActionProgress.progressPercentage >= 25 ? '#ff9800'
                    : '#f44336',
                  fontWeight: 600
                }}>
                  {control.improvementActionProgress.completedActions} / {control.improvementActionProgress.totalActions} Complete
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={control.improvementActionProgress.progressPercentage}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: control.improvementActionProgress.progressPercentage >= 80 ? '#4caf50'
                      : control.improvementActionProgress.progressPercentage >= 50 ? '#ffc107'
                      : control.improvementActionProgress.progressPercentage >= 25 ? '#ff9800'
                      : '#f44336',
                    borderRadius: 1,
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Typography variant="h6" sx={{
                  color: control.improvementActionProgress.progressPercentage >= 80 ? '#4caf50'
                    : control.improvementActionProgress.progressPercentage >= 50 ? '#ffc107'
                    : control.improvementActionProgress.progressPercentage >= 25 ? '#ff9800'
                    : '#f44336',
                  fontWeight: 600
                }}>
                  {Math.round(control.improvementActionProgress.progressPercentage)}%
                </Typography>
              </Box>
            </Box>

            {/* Status Breakdown */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <CheckCircle sx={{ fontSize: 18, color: '#4caf50' }} />
                  <Typography variant="caption" sx={{ color: '#4caf50' }}>
                    Completed
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#4caf50' }}>
                  {control.improvementActionProgress.completedActions}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 193, 7, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Schedule sx={{ fontSize: 18, color: '#ffc107' }} />
                  <Typography variant="caption" sx={{ color: '#ffc107' }}>
                    In Progress
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#ffc107' }}>
                  {control.improvementActionProgress.inProgressActions}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(158, 158, 158, 0.1)',
                  borderRadius: 1,
                  border: '1px solid rgba(158, 158, 158, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <RadioButtonUnchecked sx={{ fontSize: 18, color: '#9e9e9e' }} />
                  <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                    Not Started
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#9e9e9e' }}>
                  {control.improvementActionProgress.notStartedActions}
                </Typography>
              </Box>
            </Box>

            {/* Note */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                Progress tracked from Microsoft Secure Score and Compliance Manager
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* M365 Coverage Status */}
      <Box sx={{ mt: 3 }}>
        <M365CoverageStatus control={control} onViewM365Tab={onViewM365Tab} />
      </Box>
    </Box>
  );
};

export default OverviewTab;
