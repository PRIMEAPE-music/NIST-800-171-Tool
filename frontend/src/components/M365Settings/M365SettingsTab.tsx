import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import SettingCard from './SettingCard';
import SettingFilters from './SettingFilters';
import ComplianceStatusBadge from './ComplianceStatusBadge';
import {
  M365SettingsResponse,
  ControlSettingMapping,
  GroupedSettings,
  FilterState,
} from './types';

interface M365SettingsTabProps {
  controlId: string;
}

const M365SettingsTab: React.FC<M365SettingsTabProps> = ({ controlId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<M365SettingsResponse | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['HIGH', 'MEDIUM', 'LOW'])
  );
  const [filters, setFilters] = useState<FilterState>({
    policyType: 'all',
    platform: 'all',
    confidenceLevel: 'all',
    complianceStatus: 'all',
    searchQuery: '',
  });

  // Fetch M365 settings for control
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<M365SettingsResponse>(
        `/api/m365/control/${controlId}/settings`
      );

      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching M365 settings:', err);
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
    if (!data?.mappings) return { policyTypes: [], platforms: [] };

    const policyTypesSet = new Set<string>();
    const platformsSet = new Set<string>();

    data.mappings.forEach((mapping) => {
      policyTypesSet.add(mapping.m365Setting.policyType);
      if (mapping.m365Setting.platform) {
        platformsSet.add(mapping.m365Setting.platform);
      }
    });

    return {
      policyTypes: Array.from(policyTypesSet).sort(),
      platforms: Array.from(platformsSet).sort(),
    };
  }, [data]);

  // Filter and group settings
  const { groupedSettings, totalFiltered } = useMemo(() => {
    if (!data?.mappings) return { groupedSettings: null, totalFiltered: 0 };

    // Apply filters
    let filtered = data.mappings.filter((mapping) => {
      const setting = mapping.m365Setting;

      // Policy type filter
      if (filters.policyType !== 'all' && setting.policyType !== filters.policyType) {
        return false;
      }

      // Platform filter
      if (
        filters.platform !== 'all' &&
        setting.platform !== filters.platform &&
        setting.platform !== null
      ) {
        return false;
      }

      // Confidence level filter
      if (
        filters.confidenceLevel !== 'all' &&
        mapping.confidenceLevel !== filters.confidenceLevel
      ) {
        return false;
      }

      // Compliance status filter
      if (filters.complianceStatus !== 'all') {
        if (!mapping.complianceCheck) {
          return filters.complianceStatus === 'UNKNOWN';
        }
        if (mapping.complianceCheck.complianceStatus !== filters.complianceStatus) {
          return false;
        }
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          setting.displayName,
          setting.description,
          setting.policyType,
          setting.platform,
          mapping.rationale,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Group by confidence level
    const grouped: GroupedSettings = {
      HIGH: filtered.filter((m) => m.confidenceLevel === 'HIGH'),
      MEDIUM: filtered.filter((m) => m.confidenceLevel === 'MEDIUM'),
      LOW: filtered.filter((m) => m.confidenceLevel === 'LOW'),
    };

    return { groupedSettings: grouped, totalFiltered: filtered.length };
  }, [data, filters]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Expand/collapse all sections
  const expandAll = () => {
    setExpandedSections(new Set(['HIGH', 'MEDIUM', 'LOW']));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Render loading state
  if (loading) {
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
  if (!data?.mappings || data.mappings.length === 0) {
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
  if (totalFiltered === 0) {
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

  // Render confidence section
  const renderConfidenceSection = (
    level: 'HIGH' | 'MEDIUM' | 'LOW',
    label: string,
    color: 'success' | 'warning' | 'default'
  ) => {
    const settings = groupedSettings![level];
    if (settings.length === 0) return null;

    const isExpanded = expandedSections.has(level);

    return (
      <Accordion
        expanded={isExpanded}
        onChange={() => toggleSection(level)}
        sx={{
          bgcolor: 'background.paper',
          '&:before': {
            display: 'none',
          },
          mb: 2,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            bgcolor: 'action.hover',
            '&:hover': {
              bgcolor: 'action.selected',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {label}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {settings.length} setting{settings.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          {settings.map((mapping) => (
            <SettingCard
              key={mapping.id}
              mapping={mapping}
              defaultExpanded={false}
            />
          ))}
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box>
      {/* Header with compliance summary */}
      {data.compliance && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                M365 Compliance Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.compliance.totalSettings} total settings mapped to this control
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
              <Typography variant="body2">{data.compliance.compliantSettings}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NON_COMPLIANT" />
              <Typography variant="body2">{data.compliance.nonCompliantSettings}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComplianceStatusBadge status="NOT_CONFIGURED" />
              <Typography variant="body2">{data.compliance.notConfiguredSettings}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compliance Percentage
              </Typography>
              <Typography variant="h4" color="primary.main">
                {data.compliance.compliancePercentage.toFixed(1)}%
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Confidence Breakdown
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {data.compliance.highConfidenceCount > 0 && (
                  <Typography variant="body2">
                    {data.compliance.highConfidenceCount} High
                  </Typography>
                )}
                {data.compliance.mediumConfidenceCount > 0 && (
                  <Typography variant="body2">
                    {data.compliance.mediumConfidenceCount} Medium
                  </Typography>
                )}
                {data.compliance.lowConfidenceCount > 0 && (
                  <Typography variant="body2">
                    {data.compliance.lowConfidenceCount} Low
                  </Typography>
                )}
              </Box>
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

      {/* Expand/Collapse controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {totalFiltered} of {data.mappings.length} settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<UnfoldMoreIcon />}
            onClick={expandAll}
            sx={{ textTransform: 'none' }}
          >
            Expand All
          </Button>
          <Button
            size="small"
            startIcon={<UnfoldLessIcon />}
            onClick={collapseAll}
            sx={{ textTransform: 'none' }}
          >
            Collapse All
          </Button>
        </Box>
      </Box>

      {/* Settings grouped by confidence level */}
      <Box>
        {renderConfidenceSection('HIGH', 'High Confidence Settings', 'success')}
        {renderConfidenceSection('MEDIUM', 'Medium Confidence Settings', 'warning')}
        {renderConfidenceSection('LOW', 'Low Confidence Settings', 'default')}
      </Box>
    </Box>
  );
};

export default M365SettingsTab;
