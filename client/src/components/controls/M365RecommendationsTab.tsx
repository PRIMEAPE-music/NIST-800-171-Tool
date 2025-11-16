import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Button,
  LinearProgress,
  Tooltip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle as SatisfiedIcon,
  RadioButtonUnchecked as UnsatisfiedIcon,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as CompletedIcon,
  RadioButtonUnchecked as NotStartedIcon,
  ChangeCircle as InProgressIcon,
  OpenInNew as OpenInNewIcon,
  HelpOutline as UnknownIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Control } from '@/services/controlService';

interface M365RecommendationsTabProps {
  control: Control;
}

interface Recommendation {
  settingNames: string[];
  settingDisplayName?: string;
  validationType: string;
  requiredValue: any;
  policyTypes: string[];
  policySubType?: string;
  description: string;
  contextualHelp?: string;
  isSatisfied: boolean;
  satisfiedBy?: {
    settingName: string;
    settingValue: any;
    policyName: string;
    policyType: string;
  };
}

interface MicrosoftImprovementAction {
  title: string;
  category: string;
  priority: string;
  description?: string;
  // Live Secure Score data
  status?: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
  scoreImpact?: number;
  implementationCost?: string;
  userImpact?: string;
  implementationUrl?: string;
  lastUpdated?: string;
  completedDate?: string;
  assignedTo?: string;
  stateComment?: string;
}

interface SecureScoreSummary {
  currentScore: number;
  maxScore: number;
  percentage: number;
  activeUserCount: number;
  licensedUserCount: number;
  enabledServices: string[];
  lastUpdated: string;
}

interface ComplianceScoreSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  yourPoints: number;
  yourMaxPoints: number;
  microsoftPoints: number;
  microsoftMaxPoints: number;
  assessmentId: string;
  assessmentName: string;
  lastUpdated: string;
  controlsCount?: number;
  actionsCount?: number;
}

interface ComplianceImprovementAction {
  title: string;
  category: string;
  priority?: string;
  description?: string;
  // Live Compliance Manager data
  status?: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' | 'Unknown';
  points?: number;
  maxPoints?: number;
  implementationCost?: string;
  userImpact?: string;
  implementationUrl?: string;
  lastUpdated?: string;
  completedDate?: string;
  assignedTo?: string;
  dueDate?: string;
  evidenceRequired?: boolean;
  evidenceUploaded?: boolean;
  isManaged?: boolean;
}

interface RecommendationsResponse {
  controlId: string;
  controlTitle: string;
  family: string;
  hasRecommendations: boolean;
  totalRecommendations: number;
  satisfiedCount: number;
  recommendations: Recommendation[];
  microsoftImprovementActions: MicrosoftImprovementAction[];
  message?: string;
}

// Fetch M365 recommendations for a control (static data)
const fetchRecommendations = async (controlId: string): Promise<RecommendationsResponse> => {
  const response = await fetch(`/api/m365/recommendations/${controlId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch M365 recommendations');
  }
  const result = await response.json();
  return result.recommendations;
};

// Fetch enriched Secure Score recommendations
const fetchEnrichedRecommendations = async (controlId: string, forceRefresh = false) => {
  const response = await fetch(
    `/api/m365/secure-score/control/${controlId}?forceRefresh=${forceRefresh}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch enriched Secure Score recommendations');
  }
  const result = await response.json();
  return result.data;
};

// Fetch Secure Score summary
const fetchSecureScoreSummary = async (forceRefresh = false): Promise<SecureScoreSummary | null> => {
  try {
    const response = await fetch(`/api/m365/secure-score?forceRefresh=${forceRefresh}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Error fetching Secure Score summary:', error);
    return null;
  }
};

// Sync Secure Score data
const syncSecureScore = async () => {
  const response = await fetch('/api/m365/secure-score/sync', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to sync Secure Score');
  }
  return response.json();
};

// Fetch Compliance Score summary
const fetchComplianceScoreSummary = async (forceRefresh = false): Promise<ComplianceScoreSummary | null> => {
  try {
    const response = await fetch(`/api/m365/compliance-manager?forceRefresh=${forceRefresh}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Error fetching Compliance Score summary:', error);
    return null;
  }
};

// Fetch enriched Compliance Manager recommendations
const fetchEnrichedComplianceRecommendations = async (controlId: string, forceRefresh = false) => {
  const response = await fetch(
    `/api/m365/compliance-manager/control/${controlId}?forceRefresh=${forceRefresh}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch enriched Compliance Manager recommendations');
  }
  const result = await response.json();
  return result.data;
};

// Sync Compliance Manager data
const syncComplianceManager = async () => {
  const response = await fetch('/api/m365/compliance-manager/sync', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to sync Compliance Manager');
  }
  return response.json();
};

export const M365RecommendationsTab: React.FC<M365RecommendationsTabProps> = ({ control }) => {
  const queryClient = useQueryClient();

  // Fetch static recommendations
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['m365-recommendations', control.controlId],
    queryFn: () => fetchRecommendations(control.controlId),
  });

  // Secure Score removed - now on Dashboard instead

  // Fetch enriched Compliance Manager recommendations
  const {
    data: enrichedComplianceData,
    isLoading: _isLoadingComplianceEnriched,
    error: _enrichedComplianceError,
  } = useQuery({
    queryKey: ['compliance-manager-enriched', control.controlId],
    queryFn: () => fetchEnrichedComplianceRecommendations(control.controlId),
    retry: 1,
  });

  // Fetch policy-based improvement actions
  const {
    data: policyBasedActions,
    isLoading: isLoadingPolicyActions,
  } = useQuery({
    queryKey: ['policy-based-actions', control.controlId],
    queryFn: async () => {
      const response = await fetch(`/api/m365/improvement-actions/${control.controlId}`);
      const result = await response.json();
      return result.actions || [];
    },
    retry: 1,
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

  const formatRequiredValue = (validationType: string, requiredValue: any): string => {
    if (validationType === 'boolean') {
      return requiredValue ? 'true' : 'false';
    }
    if (validationType === 'numeric' && typeof requiredValue === 'object') {
      if (requiredValue.min !== undefined && requiredValue.max !== undefined) {
        return `${requiredValue.min} - ${requiredValue.max}`;
      }
      if (requiredValue.min !== undefined) {
        return `≥ ${requiredValue.min}`;
      }
      if (requiredValue.max !== undefined) {
        return `≤ ${requiredValue.max}`;
      }
    }
    if (Array.isArray(requiredValue)) {
      return requiredValue.join(' or ');
    }
    return String(requiredValue);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Completed':
        return <CompletedIcon sx={{ color: '#66BB6A', fontSize: 24 }} />;
      case 'InProgress':
        return <InProgressIcon sx={{ color: '#FFA726', fontSize: 24 }} />;
      case 'NotStarted':
        return <NotStartedIcon sx={{ color: '#EF5350', fontSize: 24 }} />;
      default:
        return <UnknownIcon sx={{ color: '#B0B0B0', fontSize: 24 }} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed':
        return '#66BB6A';
      case 'InProgress':
        return '#FFA726';
      case 'NotStarted':
        return '#EF5350';
      default:
        return '#B0B0B0';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'Completed';
      case 'InProgress':
        return 'In Progress';
      case 'NotStarted':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Windows':
        return '🪟';
      case 'iOS':
        return '📱';
      case 'Android':
        return '🤖';
      case 'macOS':
        return '🍎';
      default:
        return '❓';
    }
  };

  const getPlatformColor = (platformStatus: string) => {
    switch (platformStatus) {
      case 'Completed':
        return '#66BB6A';
      case 'InProgress':
        return '#FFA726';
      case 'NotStarted':
        return '#EF5350';
      default:
        return '#B0B0B0';
    }
  };

  // Get enriched compliance actions (primary source for improvement actions)
  const getEnrichedComplianceActions = (): ComplianceImprovementAction[] => {
    if (!enrichedComplianceData || !enrichedComplianceData.recommendations) {
      return [];
    }
    return enrichedComplianceData.recommendations;
  };

  if (isLoading) {
    return (
      <Box sx={{ px: 3, display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ px: 3 }}>
        <Alert severity="error">
          Failed to load M365 recommendations. Please try again later.
        </Alert>
      </Box>
    );
  }

  // Check if we have any recommendations
  const hasSettingsRecommendations = recommendations?.hasRecommendations;
  const hasComplianceActions = getEnrichedComplianceActions().length > 0;

  const hasAnyRecommendations = hasSettingsRecommendations || hasComplianceActions;

  // Only show "no recommendations" if we're sure there are none
  if (!hasAnyRecommendations && !_isLoadingComplianceEnriched) {
    return (
      <Box sx={{ px: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0', mb: 2 }}>
          Microsoft Implementation Actions Mappings
        </Typography>
        <Alert severity="info">
          {recommendations?.message || 'No Microsoft Improvement Actions available for this control.'}
        </Alert>
      </Box>
    );
  }

  // Group recommendations by policy type (only if we have settings recommendations)
  const recommendationsByType: { [key: string]: Recommendation[] } = {};
  if (recommendations?.recommendations) {
    recommendations.recommendations.forEach((rec) => {
      rec.policyTypes.forEach((type) => {
        if (!recommendationsByType[type]) {
          recommendationsByType[type] = [];
        }
        recommendationsByType[type].push(rec);
      });
    });
  }

  return (
    <Box sx={{ px: 3 }}>
      {/* Settings Recommendations Section - only show if we have them */}
      {recommendations?.hasRecommendations && (
        <>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
              Microsoft Implementation Actions Mappings
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 2 }}>
              Configure these M365 settings to satisfy this control. Settings with checkmarks are already configured and compliant.
            </Typography>

            {/* Summary Stats */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
                  Total Recommendations
                </Typography>
                <Typography variant="h6" sx={{ color: '#90CAF9' }}>
                  {recommendations.totalRecommendations}
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
                  Already Satisfied
                </Typography>
                <Typography variant="h6" sx={{ color: '#66BB6A' }}>
                  {recommendations.satisfiedCount}
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
                  Needs Configuration
                </Typography>
                <Typography variant="h6" sx={{ color: '#FFA726' }}>
                  {recommendations.totalRecommendations - recommendations.satisfiedCount}
                </Typography>
              </Paper>
            </Box>
          </Box>

          {/* Recommendations Grouped by Policy Type */}
          {Object.entries(recommendationsByType)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([policyType, recs]) => (
          <Box key={policyType} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon sx={{ color: getPolicyColor(policyType) }} />
              <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
                {policyType} Settings
              </Typography>
              <Chip
                label={`${recs.length} settings`}
                size="small"
                sx={{
                  bgcolor: getPolicyColor(policyType),
                  color: 'white',
                  fontSize: '0.7rem',
                }}
              />
            </Box>

            <Paper
              variant="outlined"
              sx={{
                bgcolor: '#1a1a1a',
                borderColor: '#4A4A4A',
                borderLeft: `4px solid ${getPolicyColor(policyType)}`,
              }}
            >
              <List disablePadding>
                {recs.map((rec, idx) => (
                  <React.Fragment key={idx}>
                    <ListItem
                      sx={{
                        py: 2,
                        px: 2,
                        bgcolor: rec.isSatisfied ? 'rgba(102, 187, 106, 0.05)' : 'transparent',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {rec.isSatisfied ? (
                          <SatisfiedIcon sx={{ color: '#66BB6A', fontSize: 28 }} />
                        ) : (
                          <UnsatisfiedIcon sx={{ color: '#B0B0B0', fontSize: 28 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="body1" sx={{ color: '#E0E0E0', fontWeight: 500 }}>
                                {rec.settingDisplayName || rec.settingNames[0]}
                              </Typography>
                              {rec.policySubType && (
                                <Chip
                                  label={rec.policySubType}
                                  size="small"
                                  sx={{
                                    fontSize: '0.65rem',
                                    height: 20,
                                    bgcolor: `${getPolicyColor(policyType)}33`,
                                    color: getPolicyColor(policyType),
                                    borderColor: getPolicyColor(policyType),
                                    borderWidth: 1,
                                    borderStyle: 'solid',
                                  }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1, fontSize: '0.875rem' }}>
                              {rec.contextualHelp || rec.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                                Setting: <span style={{ color: '#90CAF9' }}>{rec.settingNames.join(' or ')}</span>
                              </Typography>
                              <Divider orientation="vertical" flexItem sx={{ borderColor: '#4A4A4A' }} />
                              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                                Required: <span style={{ color: '#FFC107' }}>{formatRequiredValue(rec.validationType, rec.requiredValue)}</span>
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          rec.isSatisfied && rec.satisfiedBy ? (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(102, 187, 106, 0.1)', borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ color: '#66BB6A' }}>
                                ✓ Satisfied by policy: <strong>{rec.satisfiedBy.policyName}</strong>
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ color: '#B0B0B0', mt: 0.5 }}>
                                Current value: {rec.satisfiedBy.settingName} = {String(rec.satisfiedBy.settingValue)}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255, 167, 38, 0.05)', borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ color: '#FFA726' }}>
                                ⚠ This setting needs to be configured in a {policyType} policy
                              </Typography>
                            </Box>
                          )
                        }
                      />
                    </ListItem>
                    {idx < recs.length - 1 && <Divider sx={{ borderColor: '#4A4A4A' }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        ))}
        </>
      )}

      {/* Policy-Based Improvement Actions */}
      {policyBasedActions && policyBasedActions.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AssignmentIcon sx={{ color: '#42A5F5' }} />
            <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
              Implementation Actions (Policy-Based Status)
            </Typography>
            <Chip
              label={`${policyBasedActions.length} actions`}
              size="small"
              sx={{
                bgcolor: '#42A5F5',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
          </Box>

          {isLoadingPolicyActions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {policyBasedActions.map((action: any, idx: number) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: '#1a1a1a',
                    borderColor: '#4A4A4A',
                    borderLeft: `4px solid ${getStatusColor(action.status)}`,
                  }}
                >
                  {/* Action Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    {getStatusIcon(action.status)}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" sx={{ color: '#E0E0E0', fontWeight: 500 }}>
                          {action.title}
                        </Typography>
                        <Chip
                          label={getStatusText(action.status)}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            bgcolor: `${getStatusColor(action.status)}33`,
                            color: getStatusColor(action.status),
                            fontWeight: 'bold',
                          }}
                        />
                        <Chip
                          label={action.category}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                        <Chip
                          label={action.priority}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            bgcolor: action.priority === 'High' ? 'rgba(239, 83, 80, 0.2)' : 'rgba(255, 167, 38, 0.2)',
                            color: action.priority === 'High' ? '#EF5350' : '#FFA726',
                          }}
                        />
                      </Box>

                      {/* Platform Coverage Summary - Only show for platform-specific actions */}
                      {action.platformCoverage && action.platformCoverage.length > 0 && action.requiredPlatforms?.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                            Platform Coverage:
                          </Typography>
                          {action.platformCoverage.map((pc: any, pcIdx: number) => (
                            <Tooltip
                              key={pcIdx}
                              title={`${pc.platform}: ${pc.totalPoliciesCount} ${pc.totalPoliciesCount === 1 ? 'policy' : 'policies'} (${pc.compliantPoliciesCount} compliant)`}
                            >
                              <Chip
                                label={`${getPlatformIcon(pc.platform)} ${pc.platform}`}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 20,
                                  bgcolor: `${getPlatformColor(pc.platformStatus)}33`,
                                  color: getPlatformColor(pc.platformStatus),
                                  borderColor: getPlatformColor(pc.platformStatus),
                                  borderWidth: 1,
                                  borderStyle: 'solid',
                                  fontWeight: 500,
                                }}
                              />
                            </Tooltip>
                          ))}
                          <Typography variant="caption" sx={{ color: '#90CAF9', ml: 1 }}>
                            ({action.platformsCompleted}/{action.platformsRequired} complete)
                          </Typography>
                        </Box>
                      )}

                      {/* Show "Platform-Agnostic" badge for non-device actions */}
                      {(!action.requiredPlatforms || action.requiredPlatforms.length === 0) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip
                            label="Platform-Agnostic Policy"
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              bgcolor: 'rgba(144, 202, 249, 0.2)',
                              color: '#90CAF9',
                              borderColor: '#90CAF9',
                              borderWidth: 1,
                              borderStyle: 'solid',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                            Applies to all platforms
                          </Typography>
                        </Box>
                      )}

                      {/* Policy Mappings - Collapsible */}
                      {action.satisfiedBy && action.satisfiedBy.length > 0 ? (
                        <Accordion
                          sx={{
                            mt: 2,
                            bgcolor: 'transparent',
                            boxShadow: 'none',
                            '&:before': { display: 'none' },
                            border: '1px solid #4A4A4A',
                            borderRadius: '4px !important',
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: '#90CAF9' }} />}
                            sx={{
                              minHeight: 40,
                              '&.Mui-expanded': { minHeight: 40 },
                              '& .MuiAccordionSummary-content': { margin: '8px 0' },
                            }}
                          >
                            <Typography variant="caption" sx={{ color: '#90CAF9', fontWeight: 600 }}>
                              View Policy Details ({action.compliantPolicies}/{action.totalPolicies} policies compliant)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                            {action.satisfiedBy.map((policy: any, pIdx: number) => (
                            <Box
                              key={pIdx}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                bgcolor: policy.overallCompliance === 100 ? 'rgba(102, 187, 106, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                                borderRadius: 1,
                                borderLeft: `3px solid ${policy.overallCompliance === 100 ? '#66BB6A' : '#FFC107'}`,
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ color: '#E0E0E0', fontWeight: 500 }}>
                                  {policy.policyName}
                                </Typography>
                                <Chip
                                  label={policy.policyType}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 18, bgcolor: getPolicyColor(policy.policyType), color: 'white' }}
                                />
                                {policy.platform && policy.platform !== 'Unknown' && (
                                  <Chip
                                    label={`${getPlatformIcon(policy.platform)} ${policy.platform}`}
                                    size="small"
                                    sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#2A2A2A', color: '#90CAF9' }}
                                  />
                                )}
                                <Typography variant="caption" sx={{ color: policy.overallCompliance === 100 ? '#66BB6A' : '#FFC107', fontWeight: 600 }}>
                                  {policy.overallCompliance}% compliant
                                </Typography>
                              </Box>

                              {/* Settings */}
                              {policy.settings && policy.settings.length > 0 && (
                                <Box sx={{ ml: 2 }}>
                                  {policy.settings.map((setting: any, sIdx: number) => (
                                    <Box key={sIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      {setting.meetsRequirement ? (
                                        <SatisfiedIcon sx={{ fontSize: 14, color: '#66BB6A' }} />
                                      ) : (
                                        <UnsatisfiedIcon sx={{ fontSize: 14, color: '#EF5350' }} />
                                      )}
                                      <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                                        <span style={{ color: '#90CAF9' }}>{setting.settingName}</span>:{' '}
                                        <span style={{ color: setting.meetsRequirement ? '#66BB6A' : '#EF5350' }}>
                                          {String(setting.currentValue)}
                                        </span>
                                        {setting.requiredValue !== undefined && setting.requiredValue !== null && (
                                          <span style={{ color: '#888' }}> (required: {String(setting.requiredValue)})</span>
                                        )}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderColor: '#42A5F5' }}>
                          <Typography variant="caption">
                            No policies configured yet for this action. Configure policies for {action.requiredPlatforms?.join(', ') || 'all platforms'} to start tracking progress.
                          </Typography>
                        </Alert>
                      )}

                      {/* Show platform gaps - Only for platform-specific actions */}
                      {action.requiredPlatforms?.length > 0 && action.platformCoverage && action.platformCoverage.some((pc: any) => !pc.hasPolicies) && (
                        <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FFA726' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Missing Platform Coverage:
                          </Typography>
                          <Typography variant="caption">
                            {action.platformCoverage
                              .filter((pc: any) => !pc.hasPolicies)
                              .map((pc: any) => `${getPlatformIcon(pc.platform)} ${pc.platform}`)
                              .join(', ')}
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </>
          )}
        </Box>
      )}

      {/* Implementation Guide */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', borderColor: '#42A5F5' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            How to implement these recommendations:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2">
                <strong>Intune:</strong> Create or modify Compliance or Configuration policies in Microsoft Endpoint Manager
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Purview:</strong> Configure Data Loss Prevention (DLP) policies in Microsoft Purview compliance portal
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Azure AD:</strong> Set up Conditional Access policies in Azure Active Directory
              </Typography>
            </li>
          </ul>
        </Alert>
      </Box>
    </Box>
  );
};

export default M365RecommendationsTab;
