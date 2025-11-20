import React from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  HelpOutline,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Control } from '@/services/controlService';

interface M365CoverageStatusProps {
  control: Control;
  onViewM365Tab?: () => void;
}

/**
 * M365 Coverage Status Component
 * Displays the M365 settings compliance status for a control
 */
export const M365CoverageStatus: React.FC<M365CoverageStatusProps> = ({
  control,
  onViewM365Tab,
}) => {
  const m365Compliance = control.m365Compliance;

  // If no M365 compliance data, show informational message
  if (!m365Compliance || m365Compliance.totalSettings === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: '#1a1a1a',
          borderColor: '#4A4A4A',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Microsoft 365 Settings Coverage
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          No M365 settings have been mapped to this control yet.
        </Typography>
        {onViewM365Tab && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={onViewM365Tab}
            sx={{ mt: 2 }}
          >
            View M365 Settings
          </Button>
        )}
      </Paper>
    );
  }

  const percentage = m365Compliance.compliancePercentage;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: '#1a1a1a',
        borderColor: '#4A4A4A',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
          Microsoft 365 Settings Coverage
        </Typography>
        {onViewM365Tab && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={onViewM365Tab}
          >
            View Details
          </Button>
        )}
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            Compliance Status
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color:
                percentage >= 80
                  ? '#4caf50'
                  : percentage >= 50
                  ? '#ffc107'
                  : '#f44336',
              fontWeight: 600,
            }}
          >
            {m365Compliance.compliantSettings} / {m365Compliance.totalSettings} Compliant
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 10,
            borderRadius: 1,
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor:
                percentage >= 80
                  ? '#4caf50'
                  : percentage >= 50
                  ? '#ffc107'
                  : '#f44336',
              borderRadius: 1,
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Typography
            variant="h6"
            sx={{
              color:
                percentage >= 80
                  ? '#4caf50'
                  : percentage >= 50
                  ? '#ffc107'
                  : '#f44336',
              fontWeight: 600,
            }}
          >
            {Math.round(percentage)}%
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
              Compliant
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ color: '#4caf50' }}>
            {m365Compliance.compliantSettings}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(244, 67, 54, 0.1)',
            borderRadius: 1,
            border: '1px solid rgba(244, 67, 54, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Cancel sx={{ fontSize: 18, color: '#f44336' }} />
            <Typography variant="caption" sx={{ color: '#f44336' }}>
              Non-Compliant
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ color: '#f44336' }}>
            {m365Compliance.nonCompliantSettings}
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
            <HelpOutline sx={{ fontSize: 18, color: '#9e9e9e' }} />
            <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
              Not Configured
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ color: '#9e9e9e' }}>
            {m365Compliance.notConfiguredSettings}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default M365CoverageStatus;
