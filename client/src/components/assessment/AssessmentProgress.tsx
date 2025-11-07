import React from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface AssessmentProgressProps {
  currentIndex: number;
  totalControls: number;
  assessedCount: number;
  progress: number;
}

const AssessmentProgress: React.FC<AssessmentProgressProps> = ({
  currentIndex,
  totalControls,
  assessedCount,
  progress,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" color="text.secondary">
          Assessment Progress
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" fontWeight="medium">
            {assessedCount} of {totalControls} controls
          </Typography>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'success.main',
            borderRadius: 1,
          },
        }}
      />

      <Box display="flex" justifyContent="space-between" mt={1}>
        <Typography variant="caption" color="text.secondary">
          {Math.round(progress)}% Complete
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Control {currentIndex + 1} of {totalControls}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AssessmentProgress;
