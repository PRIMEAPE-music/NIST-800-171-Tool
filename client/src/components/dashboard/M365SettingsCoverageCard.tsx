import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CheckCircle, Cancel, HelpOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface M365SettingsCoverageSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  notConfigured: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byPlatform: Record<string, number>;
  byPolicyType: Record<string, number>;
}

interface M365SettingsCoverageResponse {
  success: boolean;
  settings: any[];
  summary: M365SettingsCoverageSummary;
}

export const M365SettingsCoverageCard: React.FC = () => {
  const { data, isLoading, error } = useQuery<M365SettingsCoverageResponse>({
    queryKey: ['m365-settings-coverage'],
    queryFn: async () => {
      const response = await api.get<M365SettingsCoverageResponse>(
        '/m365/policies/viewer/all-settings'
      );
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card sx={{ height: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card sx={{ height: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
        <CardContent>
          <Alert severity="error">
            Failed to load M365 settings coverage
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const summary = data.summary;
  const compliancePercentage = summary.total > 0
    ? Math.round((summary.compliant / summary.total) * 100)
    : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#4caf50'; // Green
    if (percentage >= 50) return '#ffc107'; // Yellow
    if (percentage >= 25) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const progressColor = getProgressColor(compliancePercentage);

  return (
    <Card sx={{ height: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
      <CardContent>
        {/* Header */}
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          M365 Settings Coverage
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
          Compliance status of all policy settings
        </Typography>

        {/* Main Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
              Overall Compliance
            </Typography>
            <Typography variant="body2" sx={{ color: progressColor, fontWeight: 600 }}>
              {summary.compliant} / {summary.total}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={compliancePercentage}
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
              NIST 800-171 Policy Settings
            </Typography>
            <Typography variant="h5" sx={{ color: progressColor, fontWeight: 600 }}>
              {compliancePercentage}%
            </Typography>
          </Box>
        </Box>

        {/* Settings Status Breakdown */}
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
                Compliant
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#4caf50' }}>
              {summary.compliant}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(244, 67, 54, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Cancel sx={{ fontSize: 16, color: '#f44336' }} />
              <Typography variant="caption" sx={{ color: '#f44336' }}>
                Non-Compliant
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#f44336' }}>
              {summary.nonCompliant}
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
              <HelpOutline sx={{ fontSize: 16, color: '#9e9e9e' }} />
              <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                Not Configured
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#9e9e9e' }}>
              {summary.notConfigured}
            </Typography>
          </Box>
        </Box>

        {/* Total Settings */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #333' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Tracking {summary.total} unique policy settings mapped to controls
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default M365SettingsCoverageCard;
