import React from 'react';
import { Box, Typography, TextField, Divider, Paper, Alert } from '@mui/material';
import { Control } from '@/services/controlService';

interface OverviewTabProps {
  control: Control;
  editMode: boolean;
  localNotes: string;
  onNotesChange: (notes: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  control,
  editMode,
  localNotes,
  onNotesChange,
}) => {
  return (
    <Box sx={{ px: 3 }}>
      {/* Requirement Text */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Requirement
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: '#1a1a1a',
            borderColor: '#4A4A4A',
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#E0E0E0' }}>
            {control.requirementText}
          </Typography>
        </Paper>
      </Box>

      {/* Discussion/Guidance */}
      {control.discussionText && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
            Discussion
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: '#1a1a1a',
              borderColor: '#4A4A4A',
            }}
          >
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap', color: '#B0B0B0' }}
            >
              {control.discussionText}
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

      {/* M365 Integration Status (Placeholder) */}
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          Microsoft 365 integration will be available in Phase 6 to automatically assess
          compliance based on your tenant policies.
        </Alert>
      </Box>
    </Box>
  );
};

export default OverviewTab;
