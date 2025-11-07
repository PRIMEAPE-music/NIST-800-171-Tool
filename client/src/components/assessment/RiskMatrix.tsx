import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { GapItem } from '../../services/assessmentService';

interface RiskMatrixProps {
  gaps: GapItem[];
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ gaps }) => {
  // Group gaps by risk level
  const riskGroups = {
    critical: gaps.filter((g) => g.riskScore >= 76),
    high: gaps.filter((g) => g.riskScore >= 51 && g.riskScore < 76),
    medium: gaps.filter((g) => g.riskScore >= 26 && g.riskScore < 51),
    low: gaps.filter((g) => g.riskScore < 26),
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'medium':
        return '#FFA726';
      case 'low':
        return '#66BB6A';
      default:
        return '#757575';
    }
  };

  return (
    <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
      {Object.entries(riskGroups).map(([level, items]) => (
        <Paper
          key={level}
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            border: '2px solid',
            borderColor: getRiskColor(level),
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6" textTransform="capitalize">
              {level} Risk
            </Typography>
            <Box
              sx={{
                bgcolor: getRiskColor(level),
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 'bold',
              }}
            >
              {items.length}
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {items.length === 0
              ? 'No gaps in this category'
              : `${items.length} control${items.length > 1 ? 's' : ''} need attention`}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default RiskMatrix;
