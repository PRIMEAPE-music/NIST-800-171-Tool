import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Star as StarIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { MicrosoftImprovementAction } from '@/types/microsoft-actions.types';

interface M365ActionsTabProps {
  controlId: string;
}

export const M365ActionsTab: React.FC<M365ActionsTabProps> = ({ controlId }) => {
  // Fetch actions for this control
  const { data, isLoading, error } = useQuery({
    queryKey: ['microsoft-actions', controlId],
    queryFn: async () => {
      const response = await fetch(`/api/microsoft-actions/control/${controlId}`);
      if (!response.ok) throw new Error('Failed to fetch improvement actions');
      return response.json();
    },
  });

  const actions: MicrosoftImprovementAction[] = data?.data || [];

  const getConfidenceColor = (confidence: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (confidence) {
      case 'High': return 'success';
      case 'Medium': return 'warning';
      case 'Low': return 'error';
      default: return 'default';
    }
  };

  const getCoverageColor = (coverage: string): 'success' | 'info' | 'default' => {
    switch (coverage) {
      case 'Full': return 'success';
      case 'Partial': return 'info';
      case 'Supplementary': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: '#E0E0E0' }}>Loading improvement actions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load Microsoft 365 improvement actions. Please try again.
        </Alert>
      </Box>
    );
  }

  if (actions.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No Microsoft 365 improvement actions are currently mapped to this control.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#E0E0E0', mb: 1 }}>
          Microsoft 365 Improvement Actions ({actions.length})
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          The following Microsoft 365 security improvement actions are mapped to this control
          and can help achieve compliance.
        </Typography>
      </Box>

      {/* Actions List */}
      <Stack spacing={2}>
        {actions.map((action) => (
          <Card
            key={action.id}
            variant="outlined"
            sx={{
              backgroundColor: '#2A2A2A',
              borderColor: action.isPrimary ? '#FFA726' : '#424242',
              borderLeft: action.isPrimary ? '4px solid #FFA726' : undefined,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {action.isPrimary && (
                  <StarIcon sx={{ color: '#FFA726', fontSize: 24, mt: 0.5 }} />
                )}
                <Box sx={{ flex: 1 }}>
                  {/* Action Title */}
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#E0E0E0', mb: 2 }}>
                    {action.actionTitle}
                  </Typography>

                  {/* Badges */}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2, gap: 1 }}>
                    <Chip
                      label={`Confidence: ${action.confidence}`}
                      color={getConfidenceColor(action.confidence)}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={`Coverage: ${action.coverageLevel}`}
                      color={getCoverageColor(action.coverageLevel)}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                    {action.isPrimary && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Primary Action"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </Stack>

                  {/* NIST Requirement */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#90CAF9', mb: 0.5 }}>
                      NIST Requirement:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                      {action.nistRequirement}
                    </Typography>
                  </Box>

                  {/* Mapping Rationale */}
                  <Box sx={{ p: 2, backgroundColor: '#1E1E1E', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#90CAF9', mb: 1 }}>
                      Mapping Rationale:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B0B0B0', lineHeight: 1.6 }}>
                      {action.mappingRationale}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Footer Info */}
      <Box sx={{ p: 2, backgroundColor: '#1E3A5F', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ color: '#90CAF9', fontWeight: 600, mb: 1 }}>
          Understanding Action Mappings:
        </Typography>
        <Box component="ul" sx={{ pl: 2, color: '#E0E0E0', '& li': { mb: 0.5 }, m: 0 }}>
          <li>
            <Typography variant="body2">
              <strong>Confidence:</strong> High (direct match), Medium (strong relationship), Low (indirect support)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Coverage:</strong> Full (complete control), Partial (some requirements), Supplementary (supports other actions)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Primary Actions:</strong> Main actions that should be prioritized for this control
            </Typography>
          </li>
        </Box>
      </Box>
    </Box>
  );
};

export default M365ActionsTab;
