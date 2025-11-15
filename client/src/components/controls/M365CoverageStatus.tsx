import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as FullyCoveredIcon,
  Warning as PartiallyCoveredIcon,
  Cancel as NotCoveredIcon,
  CheckCircleOutline as CompliantIcon,
  HighlightOff as NonCompliantIcon,
  ErrorOutline as GapIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Control } from '@/services/controlService';

interface M365CoverageStatusProps {
  control: Control;
  onViewM365Tab?: () => void;
}

interface PolicyWithSettings {
  id: number;
  policyId: string;
  policyName: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappedSettings: MappedSetting[];
}

interface MappedSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: any;
  validationType?: string;
  validationMessage?: string;
}

// Fetch policies mapped to this control
const fetchPoliciesForControl = async (controlId: string): Promise<PolicyWithSettings[]> => {
  const response = await fetch(`/api/controls/${controlId}/policies`);
  if (!response.ok) {
    throw new Error('Failed to fetch policies for control');
  }
  const result = await response.json();
  return result.data || result;
};

export const M365CoverageStatus: React.FC<M365CoverageStatusProps> = ({
  control,
  onViewM365Tab,
}) => {
  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['control-policies', control.controlId],
    queryFn: () => fetchPoliciesForControl(control.controlId),
  });

  if (isLoading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: '#1a1a1a',
          borderColor: '#4A4A4A',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          Loading M365 coverage status...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="warning">
        Unable to load M365 coverage status. Please try again later.
      </Alert>
    );
  }

  // Calculate coverage statistics
  const totalPolicies = policies?.length || 0;
  const allSettings = policies?.flatMap((p) => p.mappedSettings) || [];
  const compliantSettings = allSettings.filter((s) => s.meetsRequirement);
  const nonCompliantSettings = allSettings.filter((s) => !s.meetsRequirement);
  const totalSettings = allSettings.length;

  // Determine coverage level
  let coverageLevel: 'full' | 'partial' | 'none' = 'none';
  let coveragePercentage = 0;

  if (totalSettings > 0) {
    coveragePercentage = Math.round((compliantSettings.length / totalSettings) * 100);
    if (coveragePercentage === 100) {
      coverageLevel = 'full';
    } else {
      coverageLevel = 'partial';
    }
  }

  const getCoverageColor = () => {
    switch (coverageLevel) {
      case 'full':
        return '#66BB6A'; // Green
      case 'partial':
        return '#FFA726'; // Orange
      case 'none':
        return '#EF5350'; // Red
    }
  };

  const getCoverageIcon = () => {
    switch (coverageLevel) {
      case 'full':
        return <FullyCoveredIcon sx={{ color: '#66BB6A' }} />;
      case 'partial':
        return <PartiallyCoveredIcon sx={{ color: '#FFA726' }} />;
      case 'none':
        return <NotCoveredIcon sx={{ color: '#EF5350' }} />;
    }
  };

  const getCoverageLabel = () => {
    switch (coverageLevel) {
      case 'full':
        return 'Fully Covered';
      case 'partial':
        return 'Partially Covered';
      case 'none':
        return 'Not Covered';
    }
  };

  // No policies mapped
  if (totalPolicies === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: '#1a1a1a',
          borderColor: '#4A4A4A',
          borderLeft: `4px solid ${getCoverageColor()}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, mb: 2 }}>
          {getCoverageIcon()}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 0.5 }}>
              Microsoft 365 Coverage: {getCoverageLabel()}
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
              No Microsoft 365 policies are currently mapped to this control.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: '#4A4A4A' }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GapIcon fontSize="small" sx={{ color: '#FFA726' }} />
            This Control Requires:
          </Typography>
          <List dense disablePadding>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    • Manual or procedural controls
                  </Typography>
                }
              />
            </ListItem>
            <ListItem sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    • Configuration of M365 policies (see Gap Analysis for recommendations)
                  </Typography>
                }
              />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            href={`/m365/gap-analysis`}
            sx={{ color: '#90CAF9', borderColor: '#90CAF9' }}
          >
            View Gap Analysis
          </Button>
          {onViewM365Tab && (
            <Button
              size="small"
              variant="outlined"
              onClick={onViewM365Tab}
              sx={{ color: '#90CAF9', borderColor: '#90CAF9' }}
            >
              View M365 Settings Tab
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  // Policies are mapped
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: '#1a1a1a',
        borderColor: '#4A4A4A',
        borderLeft: `4px solid ${getCoverageColor()}`,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, mb: 2 }}>
        {getCoverageIcon()}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
              Microsoft 365 Coverage: {getCoverageLabel()}
            </Typography>
            <Chip
              label={`${coveragePercentage}% Compliant`}
              size="small"
              sx={{
                bgcolor: getCoverageColor(),
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            {totalPolicies} {totalPolicies === 1 ? 'policy' : 'policies'} mapped with {totalSettings} total settings
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: '#4A4A4A' }} />

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#121212',
            borderColor: '#4A4A4A',
            flex: '1 1 120px',
          }}
        >
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Compliant
          </Typography>
          <Typography variant="h6" sx={{ color: '#66BB6A' }}>
            {compliantSettings.length}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#121212',
            borderColor: '#4A4A4A',
            flex: '1 1 120px',
          }}
        >
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Non-Compliant
          </Typography>
          <Typography variant="h6" sx={{ color: '#EF5350' }}>
            {nonCompliantSettings.length}
          </Typography>
        </Paper>
      </Box>

      {/* Compliant Settings */}
      {compliantSettings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompliantIcon fontSize="small" sx={{ color: '#66BB6A' }} />
            Covered by M365 ({compliantSettings.length} settings)
          </Typography>
          <List dense disablePadding sx={{ bgcolor: 'rgba(102, 187, 106, 0.05)', borderRadius: 1, p: 1 }}>
            {compliantSettings.slice(0, 5).map((setting, idx) => (
              <ListItem key={idx} sx={{ py: 0.25, px: 1 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CompliantIcon fontSize="small" sx={{ color: '#66BB6A' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                      <strong>{setting.settingName}:</strong>{' '}
                      <span style={{ color: '#B0B0B0' }}>{String(setting.settingValue)}</span>
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            {compliantSettings.length > 5 && (
              <ListItem sx={{ py: 0.25, px: 1 }}>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{ color: '#B0B0B0', fontStyle: 'italic' }}>
                      + {compliantSettings.length - 5} more compliant settings
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* Non-Compliant Settings */}
      {nonCompliantSettings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NonCompliantIcon fontSize="small" sx={{ color: '#EF5350' }} />
            Non-Compliant Settings ({nonCompliantSettings.length} need attention)
          </Typography>
          <List dense disablePadding sx={{ bgcolor: 'rgba(239, 83, 80, 0.05)', borderRadius: 1, p: 1 }}>
            {nonCompliantSettings.slice(0, 5).map((setting, idx) => (
              <ListItem key={idx} sx={{ py: 0.25, px: 1 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <NonCompliantIcon fontSize="small" sx={{ color: '#EF5350' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                      <strong>{setting.settingName}:</strong>{' '}
                      <span style={{ color: '#EF5350' }}>{String(setting.settingValue)}</span>
                      {setting.requiredValue !== undefined && (
                        <span style={{ color: '#B0B0B0' }}>
                          {' '}
                          (should be: {typeof setting.requiredValue === 'object'
                            ? JSON.stringify(setting.requiredValue)
                            : String(setting.requiredValue)})
                        </span>
                      )}
                    </Typography>
                  }
                  secondary={
                    setting.validationMessage && (
                      <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                        {setting.validationMessage}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
            {nonCompliantSettings.length > 5 && (
              <ListItem sx={{ py: 0.25, px: 1 }}>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{ color: '#B0B0B0', fontStyle: 'italic' }}>
                      + {nonCompliantSettings.length - 5} more non-compliant settings
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* Additional Requirements */}
      {coverageLevel !== 'full' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GapIcon fontSize="small" sx={{ color: '#FFA726' }} />
            Additional Steps Required
          </Typography>
          <List dense disablePadding>
            {nonCompliantSettings.length > 0 && (
              <ListItem sx={{ py: 0.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                      • Update {nonCompliantSettings.length} non-compliant M365 {nonCompliantSettings.length === 1 ? 'setting' : 'settings'}
                    </Typography>
                  }
                />
              </ListItem>
            )}
            {coveragePercentage < 100 && (
              <ListItem sx={{ py: 0.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                      • Consider additional procedural or manual controls
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {onViewM365Tab && (
          <Button
            size="small"
            variant="contained"
            onClick={onViewM365Tab}
            sx={{ bgcolor: '#90CAF9', color: '#121212', '&:hover': { bgcolor: '#64B5F6' } }}
          >
            View Full M365 Details
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon />}
          href={`/m365/gap-analysis`}
          sx={{ color: '#90CAF9', borderColor: '#90CAF9' }}
        >
          View Gap Analysis
        </Button>
      </Box>
    </Paper>
  );
};

export default M365CoverageStatus;
