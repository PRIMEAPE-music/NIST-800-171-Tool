import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useDoDScoreSummary } from '../../hooks/useDoDScore';

const DoDScoreCard: React.FC = () => {
  const { data, loading, error } = useDoDScoreSummary();

  if (loading) {
    return (
      <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
        <CardContent>
          <Alert severity="error">{error || 'Failed to load DoD score'}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress percentage (handle negative scores)
  const scoreRange = data.maxScore - data.minScore; // 97 - (-195) = 292
  const scoreFromMin = data.currentScore - data.minScore; // currentScore - (-195)
  const progressPercent = Math.max(0, Math.min(100, (scoreFromMin / scoreRange) * 100));

  // Color mapping
  const colorMap = {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  const scoreColor = colorMap[data.scoreColor] || colorMap.warning;

  return (
    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ color: scoreColor, mr: 1 }} />
          <Typography variant="h6" component="div">
            DoD Assessment Score
          </Typography>
          <Tooltip title="SPRS Score for DFARS 252.204-7012 compliance">
            <Chip
              label="SPRS"
              size="small"
              sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }}
            />
          </Tooltip>
        </Box>

        {/* Main Score Display */}
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography
            variant="h2"
            component="div"
            sx={{ fontWeight: 'bold', color: scoreColor }}
          >
            {data.currentScore}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            out of {data.maxScore} (min: {data.minScore})
          </Typography>
          <Chip
            label={data.scoreLabel}
            size="small"
            sx={{ mt: 1, bgcolor: scoreColor, color: 'white' }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: scoreColor,
                borderRadius: 5,
              },
            }}
          />
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Verified Controls
            </Typography>
            <Typography variant="h6">
              {data.verifiedControls} / {data.totalControls}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Points Deducted
            </Typography>
            <Typography variant="h6" sx={{ color: data.pointsDeducted > 0 ? '#f44336' : '#4caf50' }}>
              {data.pointsDeducted > 0 ? (
                <>
                  <TrendingDownIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  -{data.pointsDeducted}
                </>
              ) : (
                <>
                  <TrendingUpIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  0
                </>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Compliance Percentage */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {data.compliancePercentage}% of controls verified
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DoDScoreCard;
