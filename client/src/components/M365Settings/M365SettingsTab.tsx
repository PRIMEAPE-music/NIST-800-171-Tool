import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Paper,
  Divider,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Collapse,
  Link,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  PhoneIphone as PhoneIphoneIcon,
  PhoneAndroid as PhoneAndroidIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ComplianceStatusBadge from './ComplianceStatusBadge';
import SettingFilters from './SettingFilters';
import {
  M365SettingsApiResponse,
  M365SettingItem,
  M365SettingDetail,
  FilterState,
} from './types';

interface M365SettingsTabProps {
  controlId: string;
}

// Expandable Setting Row Component
interface SettingRowProps {
  setting: M365SettingItem;
  getPlatformIcon: (platform: string | null) => React.ReactNode;
  getConfidenceColor: (confidence: string) => string;
}

const SettingRow: React.FC<SettingRowProps> = ({ setting, getPlatformIcon, getConfidenceColor }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<M365SettingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (detail) return; // Already fetched

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/m365/settings/${setting.id}`);
      setDetail(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load setting details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) {
      fetchDetail();
    }
    setOpen(!open);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === 'null') {
      return 'Not configured';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > *': { borderBottom: 'unset' },
          cursor: 'pointer',
        }}
        onClick={handleToggle}
      >
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {setting.displayName}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={setting.policyType}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </TableCell>
        <TableCell>
          {setting.platform && (
            <Chip
              icon={getPlatformIcon(setting.platform) as any}
              label={setting.platform}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </TableCell>
        <TableCell>
          <Chip
            label={setting.confidence}
            size="small"
            color={getConfidenceColor(setting.confidence) as any}
            sx={{ fontSize: '0.75rem' }}
          />
        </TableCell>
        <TableCell>
          <ComplianceStatusBadge status={setting.complianceStatus} />
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {setting.lastChecked
              ? new Date(setting.lastChecked).toLocaleString()
              : 'Never'}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              {loading && (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {detail && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {/* Description */}
                  {detail.description && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {detail.description}
                      </Typography>
                    </Box>
                  )}

                  {/* Setting Path */}
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                      Setting Path:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {detail.settingPath}
                    </Typography>
                  </Box>

                  {/* Expected vs Actual Values */}
                  <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                    <Box flex={1} minWidth={200}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                        Expected Value:
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          backgroundColor: 'background.default',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {formatValue(detail.expectedValue)}
                      </Paper>
                    </Box>
                    <Box flex={1} minWidth={200}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                        Actual Value:
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          backgroundColor: detail.complianceCheck?.isCompliant
                            ? 'rgba(46, 125, 50, 0.08)'
                            : 'rgba(211, 47, 47, 0.08)',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {formatValue(detail.complianceCheck?.actualValue)}
                      </Paper>
                    </Box>
                  </Box>

                  {/* Validation Operator */}
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                      Validation Operator:
                    </Typography>
                    <Chip label={detail.validationOperator} size="small" variant="outlined" />
                  </Box>

                  {/* Implementation Guide */}
                  {detail.implementationGuide && (
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                        Implementation Guide:
                      </Typography>
                      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {detail.implementationGuide
                          .split(/(?=\d+\.\s)/)
                          .filter(step => step.trim())
                          .map((step, index) => {
                            // Remove the leading number and period since we're using <ol>
                            const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
                            if (!cleanStep) return null;

                            // Check if this step has sub-items (lines starting with -)
                            const parts = cleanStep.split(/(?=\s-\s)/);
                            const mainText = parts[0];
                            const subItems = parts.slice(1).map(s => s.replace(/^\s-\s/, '').trim()).filter(Boolean);

                            return (
                              <Box component="li" key={index} sx={{ mb: 1 }}>
                                <Typography variant="body2" component="span">
                                  {mainText}
                                </Typography>
                                {subItems.length > 0 && (
                                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                                    {subItems.map((subItem, subIndex) => (
                                      <Box component="li" key={subIndex} sx={{ mb: 0.25 }}>
                                        <Typography variant="body2" component="span">
                                          {subItem}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                      </Box>
                    </Box>
                  )}

                  {/* Microsoft Docs Link */}
                  {detail.microsoftDocsUrl && (
                    <Box mb={2}>
                      <Link
                        href={detail.microsoftDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <OpenInNewIcon fontSize="small" />
                        View Microsoft Documentation
                      </Link>
                    </Box>
                  )}

                  {/* Mapped Controls */}
                  {detail.mappedControls && detail.mappedControls.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                        Mapped Controls:
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {detail.mappedControls.map((control) => (
                          <Tooltip key={control.controlId} title={`${control.family} - ${control.controlTitle}`}>
                            <Chip
                              label={control.controlId}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Error Message - only show for non-compliant settings with actual error info */}
                  {detail.complianceCheck?.errorMessage &&
                   !detail.complianceCheck.isCompliant &&
                   !detail.complianceCheck.errorMessage.toLowerCase().includes('non-compliant') && (
                    <Box mt={2}>
                      <Alert severity="warning">
                        {detail.complianceCheck.errorMessage}
                      </Alert>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const M365SettingsTab: React.FC<M365SettingsTabProps> = ({ controlId }) => {
  console.log('🚀 M365SettingsTab rendering with controlId:', controlId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<M365SettingsApiResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    policyType: 'all',
    platform: 'all',
    confidenceLevel: 'all',
    complianceStatus: 'all',
    searchQuery: '',
  });

  // Fetch M365 settings for control
  const fetchSettings = async () => {
    console.log('📡 Fetching M365 settings for control:', controlId);
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<M365SettingsApiResponse>(
        `/api/m365/control/${controlId}/settings`
      );

      console.log('✅ M365 settings response:', response.data);
      setData(response.data);
    } catch (err: any) {
      console.error('❌ Error fetching M365 settings:', err);
      setError(err.response?.data?.error || 'Failed to load M365 settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [controlId]);

  // Extract unique values for filters
  const { policyTypes, platforms } = useMemo(() => {
    if (!data?.data?.settings) return { policyTypes: [], platforms: [] };

    const policyTypesSet = new Set<string>();
    const platformsSet = new Set<string>();

    data.data.settings.forEach((setting) => {
      policyTypesSet.add(setting.policyType);
      if (setting.platform) {
        platformsSet.add(setting.platform);
      }
    });

    return {
      policyTypes: Array.from(policyTypesSet).sort(),
      platforms: Array.from(platformsSet).sort(),
    };
  }, [data]);

  // Filter settings
  const filteredSettings = useMemo(() => {
    if (!data?.data?.settings) return [];

    return data.data.settings.filter((setting) => {
      // Policy type filter
      if (filters.policyType !== 'all' && setting.policyType !== filters.policyType) {
        return false;
      }

      // Platform filter
      if (filters.platform !== 'all' && setting.platform !== filters.platform) {
        return false;
      }

      // Confidence level filter
      if (filters.confidenceLevel !== 'all' && setting.confidence !== filters.confidenceLevel) {
        return false;
      }

      // Compliance status filter
      if (filters.complianceStatus !== 'all' && setting.complianceStatus !== filters.complianceStatus) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return setting.displayName.toLowerCase().includes(query);
      }

      return true;
    });
  }, [data, filters]);

  // Get platform icon
  const getPlatformIcon = (platform: string | null) => {
    if (!platform) return null;

    const platformLower = platform.toLowerCase();
    if (platformLower.includes('windows')) return <ComputerIcon fontSize="small" />;
    if (platformLower.includes('ios')) return <PhoneIphoneIcon fontSize="small" />;
    if (platformLower.includes('android')) return <PhoneAndroidIcon fontSize="small" />;
    return null;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'default';
      default:
        return 'default';
    }
  };

  // Render loading state
  if (loading) {
    console.log('⏳ Rendering loading state');
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={fetchSettings}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  // Render empty state
  if (!data?.data?.settings || data.data.settings.length === 0) {
    console.log('📭 Rendering empty state. Data:', data);
    return (
      <Alert severity="info">
        <Typography variant="body2">
          No M365 settings have been mapped to this control yet.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          M365 settings are automatically mapped based on NIST control requirements and
          Microsoft 365 policy configurations. Check back after running the policy sync or
          contact your administrator for more information.
        </Typography>
      </Alert>
    );
  }

  // Render no results after filtering
  if (filteredSettings.length === 0) {
    console.log('🔍 Rendering no results state');
    return (
      <Box>
        <SettingFilters
          filters={filters}
          onFilterChange={setFilters}
          policyTypes={policyTypes}
          platforms={platforms}
        />
        <Alert severity="info">
          <Typography variant="body2">
            No settings match the current filters. Try adjusting your filter criteria.
          </Typography>
        </Alert>
      </Box>
    );
  }

  console.log('📊 Rendering main view with', filteredSettings.length, 'settings');

  return (
    <Box>
      {/* Header with compliance summary */}
      {data.data.summary && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                M365 Compliance Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.data.summary.total} total settings mapped to this control
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton onClick={fetchSettings} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="COMPLIANT" />
              <Typography variant="body2">{data.data.summary.compliant}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NON_COMPLIANT" />
              <Typography variant="body2">{data.data.summary.nonCompliant}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NOT_CONFIGURED" />
              <Typography variant="body2">{data.data.summary.notConfigured}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="UNKNOWN" />
              <Typography variant="body2">{data.data.summary.notChecked}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compliance Percentage
              </Typography>
              <Typography variant="h4" color="primary.main">
                {data.data.summary.total > 0
                  ? ((data.data.summary.compliant / data.data.summary.total) * 100).toFixed(1)
                  : 0}%
              </Typography>
            </Box>
            <Box sx={{ flex: 1, maxWidth: 400 }}>
              <LinearProgress
                variant="determinate"
                value={data.data.summary.total > 0
                  ? (data.data.summary.compliant / data.data.summary.total) * 100
                  : 0}
                sx={{
                  height: 12,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    bgcolor: data.data.summary.total > 0 && (data.data.summary.compliant / data.data.summary.total) * 100 >= 80
                      ? '#4caf50'
                      : data.data.summary.total > 0 && (data.data.summary.compliant / data.data.summary.total) * 100 >= 50
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
      <SettingFilters
        filters={filters}
        onFilterChange={setFilters}
        policyTypes={policyTypes}
        platforms={platforms}
      />

      {/* Results count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredSettings.length} of {data.data.settings.length} settings
        </Typography>
      </Box>

      {/* Settings table */}
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
              <TableCell>Last Checked</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                getPlatformIcon={getPlatformIcon}
                getConfidenceColor={getConfidenceColor}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default M365SettingsTab;
