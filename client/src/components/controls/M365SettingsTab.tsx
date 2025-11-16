import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircleOutline as CompliantIcon,
  HighlightOff as NonCompliantIcon,
  Policy as PolicyIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Control } from '@/services/controlService';

interface M365SettingsTabProps {
  control: Control;
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
  // Handle both wrapped {success, data} and direct array responses
  return result.data || result;
};

export const M365SettingsTab: React.FC<M365SettingsTabProps> = ({ control }) => {
  const navigate = useNavigate();

  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['control-policies', control.controlId],
    queryFn: () => fetchPoliciesForControl(control.controlId),
  });

  const getPolicyColor = (policyType: string) => {
    switch (policyType) {
      case 'Intune':
        return '#42A5F5';
      case 'Purview':
        return '#AB47BC';
      case 'AzureAD':
        return '#66BB6A';
      default:
        return '#B0B0B0';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'success';
      case 'Medium':
        return 'warning';
      default:
        return 'default';
    }
  };

  const calculateCompliance = (settings: MappedSetting[]) => {
    if (settings.length === 0) return 0;
    const compliant = settings.filter((s) => s.meetsRequirement).length;
    return Math.round((compliant / settings.length) * 100);
  };

  if (isLoading) {
    return (
      <Box sx={{ px: 3 }}>
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          Loading M365 settings...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ px: 3 }}>
        <Alert severity="error">
          Failed to load M365 settings for this control. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!policies || policies.length === 0) {
    return (
      <Box sx={{ px: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            No Microsoft 365 policies are currently mapped to this control.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            This could mean:
          </Typography>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>No M365 settings directly satisfy this control</li>
            <li>Policies need to be synced from your M365 tenant</li>
            <li>This control may require manual procedural controls</li>
          </ul>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
        M365 Policy Settings Mapping
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
        These M365 policy settings contribute to satisfying this control. Click on a policy to
        view full details.
      </Typography>

      {/* Summary Stats */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#1a1a1a',
            borderColor: '#4A4A4A',
          }}
        >
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Mapped Policies
          </Typography>
          <Typography variant="h6" sx={{ color: '#90CAF9' }}>
            {policies.length}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#1a1a1a',
            borderColor: '#4A4A4A',
          }}
        >
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Total Settings
          </Typography>
          <Typography variant="h6" sx={{ color: '#90CAF9' }}>
            {policies.reduce((sum, p) => sum + p.mappedSettings.length, 0)}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#1a1a1a',
            borderColor: '#4A4A4A',
          }}
        >
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Compliant Settings
          </Typography>
          <Typography variant="h6" sx={{ color: '#66BB6A' }}>
            {policies.reduce(
              (sum, p) => sum + p.mappedSettings.filter((s) => s.meetsRequirement).length,
              0
            )}
          </Typography>
        </Paper>
      </Box>

      {/* Policies Grouped by Type */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {policies.map((policy) => {
          const compliancePercentage = calculateCompliance(policy.mappedSettings);

          return (
            <Paper
              key={policy.id}
              variant="outlined"
              sx={{
                bgcolor: '#1a1a1a',
                borderColor: '#4A4A4A',
                borderLeft: `4px solid ${getPolicyColor(policy.policyType)}`,
              }}
            >
              {/* Policy Header */}
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PolicyIcon sx={{ color: getPolicyColor(policy.policyType), fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ color: '#E0E0E0', fontWeight: 500 }}>
                      {policy.policyName}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={policy.policyType}
                      size="small"
                      sx={{
                        bgcolor: getPolicyColor(policy.policyType),
                        color: 'white',
                        fontSize: '0.7rem',
                      }}
                    />
                    <Chip
                      label={`${policy.mappingConfidence} Confidence`}
                      size="small"
                      color={getConfidenceColor(policy.mappingConfidence) as any}
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                      {compliancePercentage}% Compliant
                    </Typography>
                  </Box>
                </Box>

                <Button
                  size="small"
                  endIcon={<LaunchIcon />}
                  onClick={() => navigate(`/policy-viewer?policyId=${policy.policyId}`)}
                  sx={{ color: '#90CAF9' }}
                >
                  View Policy
                </Button>
              </Box>

              <Divider sx={{ borderColor: '#4A4A4A' }} />

              {/* Settings List */}
              <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
                  Mapped Settings ({policy.mappedSettings.length})
                </Typography>
                <List dense disablePadding>
                  {policy.mappedSettings.map((setting, idx) => (
                    <ListItem
                      key={idx}
                      sx={{
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.02)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {setting.meetsRequirement ? (
                          <CompliantIcon color="success" fontSize="small" />
                        ) : (
                          <NonCompliantIcon color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                            <strong>{setting.settingName}:</strong>{' '}
                            <span style={{ color: '#B0B0B0' }}>{String(setting.settingValue)}</span>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: '#9E9E9E' }}>
                            {setting.validationMessage ||
                              (setting.meetsRequirement ? 'Meets requirement' : 'Does not meet requirement')}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default M365SettingsTab;
