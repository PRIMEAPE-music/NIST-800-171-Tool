import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  Divider,
  Link,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  ViewList as TableViewIcon,
  ViewModule as CardViewIcon,
  CheckCircle,
  Cancel,
  HelpOutline,
  OpenInNew,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import policyViewerService from '@/services/policyViewer.service';
import SettingsToControlsFiltersComponent from './SettingsToControlsFilters';
import {
  PolicySettingToControl,
  SettingsToControlsFilters,
  ViewMode,
} from '@/types/policyViewer.types';
import { SettingAssociationButton, ReviewedBadge } from '../manual-review';

interface SettingsToControlsTabProps {
  policyId: number;
}

// Helper function to get platform icon
const getPlatformIcon = (platform: string): string => {
  const platformLower = platform.toLowerCase();
  if (platformLower.includes('windows')) return '🪟';
  if (platformLower.includes('ios') || platformLower.includes('iphone')) return '📱';
  if (platformLower.includes('android')) return '🤖';
  if (platformLower.includes('macos')) return '💻';
  return '🌐';
};

// Helper function to get confidence color
const getConfidenceColor = (confidence: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (confidence) {
    case 'High':
      return 'success';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'error';
    default:
      return 'default';
  }
};

// Helper function to get priority color
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'Critical':
      return '#f44336'; // red
    case 'High':
      return '#ff9800'; // orange
    case 'Medium':
      return '#ffeb3b'; // yellow
    case 'Low':
      return '#9e9e9e'; // gray
    default:
      return '#9e9e9e';
  }
};

// Compliance Status Badge Component
const ComplianceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLIANT':
        return {
          icon: <CheckCircle fontSize="small" />,
          label: 'Compliant',
          color: '#4caf50',
        };
      case 'NON_COMPLIANT':
        return {
          icon: <Cancel fontSize="small" />,
          label: 'Non-Compliant',
          color: '#f44336',
        };
      case 'NOT_CONFIGURED':
        return {
          icon: <HelpOutline fontSize="small" />,
          label: 'Not Configured',
          color: '#ff9800',
        };
      default:
        return {
          icon: <HelpOutline fontSize="small" />,
          label: 'Unknown',
          color: '#9e9e9e',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.color,
        color: '#fff',
        fontWeight: 500,
      }}
    />
  );
};

// Single Setting Row Component (for table view)
const SettingRow: React.FC<{
  setting: PolicySettingToControl;
  onNavigateToControl: (controlId: string) => void;
  policyId: number;
}> = ({ setting, onNavigateToControl, policyId }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          bgcolor: open ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
        }}
      >
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{setting.settingName}</Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={setting.policyType}
            size="small"
            color={
              setting.policyType === 'Intune'
                ? 'info'
                : setting.policyType === 'Purview'
                ? 'secondary'
                : 'success'
            }
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{getPlatformIcon(setting.platform)}</span>
            <Typography variant="body2">{setting.platform}</Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={setting.confidence}
            size="small"
            color={getConfidenceColor(setting.confidence)}
          />
        </TableCell>
        <TableCell>
          <ComplianceStatusBadge status={setting.complianceStatus} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {setting.expectedValue.substring(0, 30)}
            {setting.expectedValue.length > 30 ? '...' : ''}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
              {/* Description */}
              {setting.settingDescription && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                    Description:
                  </Typography>
                  <Typography variant="body2">{setting.settingDescription}</Typography>
                </Box>
              )}

              {/* Setting Path */}
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                  Setting Path:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {setting.settingPath}
                </Typography>
              </Box>

              <Grid container spacing={2} mb={2}>
                {/* Expected Value */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                    Expected Value:
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#2C2C2C' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {setting.expectedValue}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Actual Value */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                    Actual Value:
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#2C2C2C' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        color: setting.isCompliant ? '#4caf50' : '#f44336',
                      }}
                    >
                      {setting.actualValue || 'Not configured'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Validation Operator */}
              {setting.validationOperator && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                    Validation Operator:
                  </Typography>
                  <Chip label={setting.validationOperator} size="small" />
                </Box>
              )}

              {/* Implementation Guide */}
              {setting.implementationGuide && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                    Implementation Guide:
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#2C2C2C' }}>
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ whiteSpace: 'pre-line' }}
                    >
                      {setting.implementationGuide}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Microsoft Documentation */}
              {setting.microsoftDocsUrl && (
                <Box mb={2}>
                  <Link
                    href={setting.microsoftDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <OpenInNew fontSize="small" />
                    View Microsoft Documentation
                  </Link>
                </Box>
              )}

              {/* Manual Review Actions */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <SettingAssociationButton
                  setting={{
                    id: setting.id,
                    displayName: setting.settingName,
                    settingPath: setting.settingPath,
                    expectedValue: setting.expectedValue,
                    description: setting.settingDescription,
                    policyType: setting.policyType,
                  }}
                  policyId={policyId}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['all-settings-to-controls'] });
                  }}
                />
                {setting.manualReview?.isReviewed && (
                  <ReviewedBadge
                    isReviewed={setting.manualReview.isReviewed}
                    manualComplianceStatus={setting.manualReview.manualComplianceStatus}
                    reviewedAt={setting.manualReview.reviewedAt}
                    rationale={setting.manualReview.rationale}
                  />
                )}
              </Box>

              {/* Mapped Controls */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                  Mapped Controls:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {setting.mappedControls.map((control) => (
                    <Tooltip
                      key={control.controlId}
                      title={`${control.controlTitle} - ${control.controlFamily} (${control.controlPriority})`}
                    >
                      <Chip
                        label={control.controlId}
                        size="small"
                        onClick={() => onNavigateToControl(control.controlId)}
                        sx={{
                          cursor: 'pointer',
                          borderColor: getPriorityColor(control.controlPriority),
                          borderWidth: 2,
                          borderStyle: 'solid',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Single Setting Card Component (for card view)
const SettingCard: React.FC<{
  setting: PolicySettingToControl;
  onNavigateToControl: (controlId: string) => void;
  policyId: number;
}> = ({ setting, onNavigateToControl, policyId }) => {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  return (
    <Card
      sx={{
        bgcolor: '#2C2C2C',
        '&:hover': { bgcolor: '#333' },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {setting.settingName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label={setting.policyType}
                size="small"
                color={
                  setting.policyType === 'Intune'
                    ? 'info'
                    : setting.policyType === 'Purview'
                    ? 'secondary'
                    : 'success'
                }
              />
              <Chip
                label={`${getPlatformIcon(setting.platform)} ${setting.platform}`}
                size="small"
              />
              <Chip
                label={setting.confidence}
                size="small"
                color={getConfidenceColor(setting.confidence)}
              />
              <ComplianceStatusBadge status={setting.complianceStatus} />
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Box>

        {/* Expected Value (always visible) */}
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ color: '#B0B0B0' }}>
            Expected Value:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {setting.expectedValue}
          </Typography>
        </Box>

        {/* Manual Review Actions */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <SettingAssociationButton
            setting={{
              id: setting.id,
              displayName: setting.settingName,
              settingPath: setting.settingPath,
              expectedValue: setting.expectedValue,
              description: setting.settingDescription,
              policyType: setting.policyType,
            }}
            policyId={policyId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['all-settings-to-controls'] });
            }}
          />
          {setting.manualReview?.isReviewed && (
            <ReviewedBadge
              isReviewed={setting.manualReview.isReviewed}
              manualComplianceStatus={setting.manualReview.manualComplianceStatus}
              reviewedAt={setting.manualReview.reviewedAt}
              rationale={setting.manualReview.rationale}
            />
          )}
        </Box>

        {/* Mapped Controls (always visible) */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#B0B0B0', mb: 1 }}>
            Mapped Controls:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {setting.mappedControls.map((control) => (
              <Tooltip
                key={control.controlId}
                title={`${control.controlTitle} - ${control.controlFamily} (${control.controlPriority})`}
              >
                <Chip
                  label={control.controlId}
                  size="small"
                  onClick={() => onNavigateToControl(control.controlId)}
                  sx={{
                    cursor: 'pointer',
                    borderColor: getPriorityColor(control.controlPriority),
                    borderWidth: 2,
                    borderStyle: 'solid',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Expanded Details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />

          {/* Description */}
          {setting.settingDescription && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                Description:
              </Typography>
              <Typography variant="body2">{setting.settingDescription}</Typography>
            </Box>
          )}

          {/* Setting Path */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
              Setting Path:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {setting.settingPath}
            </Typography>
          </Box>

          {/* Actual Value */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
              Actual Value:
            </Typography>
            <Paper sx={{ p: 1.5, bgcolor: '#1a1a1a' }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: setting.isCompliant ? '#4caf50' : '#f44336',
                }}
              >
                {setting.actualValue || 'Not configured'}
              </Typography>
            </Paper>
          </Box>

          {/* Implementation Guide */}
          {setting.implementationGuide && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                Implementation Guide:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#1a1a1a' }}>
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                  {setting.implementationGuide}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Microsoft Documentation */}
          {setting.microsoftDocsUrl && (
            <Box>
              <Link
                href={setting.microsoftDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <OpenInNew fontSize="small" />
                View Microsoft Documentation
              </Link>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Main Tab Component
const SettingsToControlsTab: React.FC<SettingsToControlsTabProps> = ({ policyId }) => {
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<SettingsToControlsFilters>({
    searchQuery: '',
    policyType: 'all',
    platform: 'all',
    controlPriority: 'all',
    controlFamily: 'all',
    complianceStatus: 'all',
  });

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['policy-settings-to-controls', policyId],
    queryFn: () => policyViewerService.getPolicySettingsToControls(policyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract unique values for filters
  const { availablePlatforms, availableFamilies } = useMemo(() => {
    if (!data?.settings) {
      return { availablePlatforms: [], availableFamilies: [] };
    }

    const platforms = new Set<string>();
    const families = new Set<string>();

    data.settings.forEach((setting) => {
      platforms.add(setting.platform);
      setting.mappedControls.forEach((control) => {
        families.add(control.controlFamily);
      });
    });

    return {
      availablePlatforms: Array.from(platforms),
      availableFamilies: Array.from(families),
    };
  }, [data]);

  // Apply filters
  const filteredSettings = useMemo(() => {
    if (!data?.settings) return [];

    return data.settings.filter((setting) => {
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = setting.settingName.toLowerCase().includes(query);
        const matchesDescription = setting.settingDescription?.toLowerCase().includes(query);
        const matchesPath = setting.settingPath.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesPath) {
          return false;
        }
      }

      // Platform filter
      if (filters.platform !== 'all' && setting.platform !== filters.platform) {
        return false;
      }

      // Control priority filter
      if (filters.controlPriority !== 'all') {
        const hasMatchingPriority = setting.mappedControls.some(
          (control) => control.controlPriority === filters.controlPriority
        );
        if (!hasMatchingPriority) {
          return false;
        }
      }

      // Control family filter
      if (filters.controlFamily !== 'all') {
        const hasMatchingFamily = setting.mappedControls.some(
          (control) => control.controlFamily === filters.controlFamily
        );
        if (!hasMatchingFamily) {
          return false;
        }
      }

      // Compliance status filter
      if (
        filters.complianceStatus !== 'all' &&
        setting.complianceStatus !== filters.complianceStatus
      ) {
        return false;
      }

      return true;
    });
  }, [data?.settings, filters]);

  // Navigate to control's M365 Settings tab
  const handleNavigateToControl = (controlId: string) => {
    // Find control in the database to get its ID
    // The control detail page URL is /controls/:id with a tab parameter
    navigate(`/controls/${controlId}?tab=m365`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body2">
          Failed to load policy settings: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Alert>
    );
  }

  // No data state
  if (!data || data.settings.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No policy settings are mapped to controls yet. Policy settings will appear here once they
          are mapped to NIST controls through the auto-mapping system or manual mapping.
        </Typography>
      </Alert>
    );
  }

  // Render no results after filtering
  if (filteredSettings.length === 0) {
    return (
      <Box>
        <SettingsToControlsFiltersComponent
          filters={filters}
          onFilterChange={setFilters}
          availablePlatforms={availablePlatforms}
          availableFamilies={availableFamilies}
        />
        <Alert severity="info">
          <Typography variant="body2">
            No settings match the current filters. Try adjusting your filter criteria.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Section */}
      {data.summary && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Settings to Controls Mapping Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.summary.total} policy settings mapped to controls
              </Typography>
            </Box>
          </Box>

          {/* Compliance Status Breakdown */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="COMPLIANT" />
              <Typography variant="body2">{data.summary.compliant}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NON_COMPLIANT" />
              <Typography variant="body2">{data.summary.nonCompliant}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NOT_CONFIGURED" />
              <Typography variant="body2">{data.summary.notConfigured}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Compliance Percentage */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compliance Percentage
              </Typography>
              <Typography variant="h4" color="primary.main">
                {data.summary.total > 0
                  ? ((data.summary.compliant / data.summary.total) * 100).toFixed(1)
                  : 0}
                %
              </Typography>
            </Box>
            <Box sx={{ flex: 1, maxWidth: 400 }}>
              <LinearProgress
                variant="determinate"
                value={
                  data.summary.total > 0 ? (data.summary.compliant / data.summary.total) * 100 : 0
                }
                sx={{
                  height: 12,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    bgcolor:
                      data.summary.total > 0 &&
                      (data.summary.compliant / data.summary.total) * 100 >= 80
                        ? '#4caf50'
                        : data.summary.total > 0 &&
                          (data.summary.compliant / data.summary.total) * 100 >= 50
                        ? '#ffc107'
                        : '#f44336',
                  },
                }}
              />
            </Box>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <SettingsToControlsFiltersComponent
        filters={filters}
        onFilterChange={setFilters}
        availablePlatforms={availablePlatforms}
        availableFamilies={availableFamilies}
      />

      {/* View Mode Toggle & Results Count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredSettings.length} of {data.settings.length} settings
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="table">
            <Tooltip title="Table View">
              <TableViewIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="card">
            <Tooltip title="Card View">
              <CardViewIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Table View */}
      {viewMode === 'table' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Setting Name</TableCell>
                <TableCell>Policy Type</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expected Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSettings.map((setting) => (
                <SettingRow
                  key={setting.id}
                  setting={setting}
                  onNavigateToControl={handleNavigateToControl}
                  policyId={policyId}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <Grid container spacing={2}>
          {filteredSettings.map((setting) => (
            <Grid item xs={12} md={6} lg={4} key={setting.id}>
              <SettingCard
                setting={setting}
                onNavigateToControl={handleNavigateToControl}
                policyId={policyId}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SettingsToControlsTab;
