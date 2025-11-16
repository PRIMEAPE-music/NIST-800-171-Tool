import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import {
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { Control } from '@/services/controlService';

interface M365CoverageStatusProps {
  control: Control;
  onViewM365Tab?: () => void;
}

/**
 * Simplified M365 Coverage Status Component
 * Note: M365 policy mapping functionality has been removed.
 * This component now serves as a placeholder.
 */
export const M365CoverageStatus: React.FC<M365CoverageStatusProps> = ({
  control,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: '#1a1a1a',
        borderColor: '#4A4A4A',
        borderLeft: `4px solid #4A90E2`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
        <InfoIcon sx={{ color: '#4A90E2', mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 1 }}>
            Microsoft 365 Coverage
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1.5 }}>
            M365 policy mapping functionality is currently unavailable.
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            To address this control, please implement appropriate technical and procedural measures
            based on the control requirements and your organization's policies.
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default M365CoverageStatus;
