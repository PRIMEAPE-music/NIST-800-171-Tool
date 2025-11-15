import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
} from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Schedule } from '@mui/icons-material';

interface ImprovementActionsData {
  totalActions: number;
  completedActions: number;
  progressPercentage: number;
  controlsWithProgress: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

interface Props {
  data?: ImprovementActionsData;
}

export const ImprovementActionsCard: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <Card sx={{ height: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
            Improvement Actions
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            No data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#4caf50'; // Green
    if (percentage >= 50) return '#ffc107'; // Yellow
    if (percentage >= 25) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const progressColor = getProgressColor(data.progressPercentage);

  return (
    <Card sx={{ height: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
      <CardContent>
        {/* Header */}
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          M365 Improvement Actions
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
          Implementation progress from Secure Score
        </Typography>

        {/* Main Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
              Overall Progress
            </Typography>
            <Typography variant="body2" sx={{ color: progressColor, fontWeight: 600 }}>
              {data.completedActions} / {data.totalActions}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={data.progressPercentage}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: progressColor,
                borderRadius: 1,
              },
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#888' }}>
              NIST 800-171 Actions
            </Typography>
            <Typography variant="h5" sx={{ color: progressColor, fontWeight: 600 }}>
              {Math.round(data.progressPercentage)}%
            </Typography>
          </Box>
        </Box>

        {/* Control Status Breakdown */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'rgba(76, 175, 80, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(76, 175, 80, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
              <Typography variant="caption" sx={{ color: '#4caf50' }}>
                Completed
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#4caf50' }}>
              {data.controlsWithProgress.completed}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              bgcolor: 'rgba(255, 193, 7, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(255, 193, 7, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Schedule sx={{ fontSize: 16, color: '#ffc107' }} />
              <Typography variant="caption" sx={{ color: '#ffc107' }}>
                In Progress
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#ffc107' }}>
              {data.controlsWithProgress.inProgress}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              bgcolor: 'rgba(158, 158, 158, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(158, 158, 158, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <RadioButtonUnchecked sx={{ fontSize: 16, color: '#9e9e9e' }} />
              <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                Not Started
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#9e9e9e' }}>
              {data.controlsWithProgress.notStarted}
            </Typography>
          </Box>
        </Box>

        {/* Total Controls */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #333' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Tracking {data.controlsWithProgress.total} controls with improvement actions
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ImprovementActionsCard;
