# Phase 7: M365 Settings Tab Component

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 7 of 12 - Frontend Layer  
**Status:** Ready for Implementation  
**Optimized For:** Claude Code Execution  
**Date:** 2024-11-17

---

## 📋 PHASE OVERVIEW

### What This Phase Does
Creates a new tab on the Control Detail page that displays all M365 settings mapped to a specific NIST control. Users can view setting details, compliance status, expected configurations, and implementation guidance.

### Key Deliverables
- ✅ M365SettingsTab component with filtering and grouping
- ✅ SettingCard component for individual setting display
- ✅ ComplianceStatusBadge component for visual indicators
- ✅ Filter controls for policy type, platform, and confidence
- ✅ Collapsible accordion sections
- ✅ Loading and empty states
- ✅ Integration with Control Detail page

### Dependencies
- ✅ Phase 1: Database Schema (Complete)
- ✅ Phase 2: Data Import (Complete)
- ⏸️ Phase 5: API Endpoints (Must be complete)

### Estimated Time
**3-4 hours** for full implementation and testing

---

## 🎯 IMPLEMENTATION GOALS

### User Experience Goals
1. **Clear Overview:** Users immediately see how many M365 settings map to a control
2. **Organized Display:** Settings grouped by confidence level (High/Medium/Low)
3. **Actionable Information:** Each setting shows what to configure and how
4. **Easy Filtering:** Filter by policy type, platform, and confidence
5. **Compliance Visibility:** Clear indicators for compliant/non-compliant/not-configured

### Technical Goals
1. **Performance:** Fast rendering with lazy loading for large setting lists
2. **Responsive:** Works on mobile, tablet, and desktop
3. **Accessible:** Proper ARIA labels and keyboard navigation
4. **Type-Safe:** Full TypeScript coverage
5. **Dark Theme:** Consistent with application styling

---

## 📁 FILES TO CREATE/MODIFY

### New Files to Create
```
frontend/src/components/M365Settings/
├── M365SettingsTab.tsx          # Main tab component
├── SettingCard.tsx               # Individual setting display
├── ComplianceStatusBadge.tsx    # Status indicator component
├── SettingFilters.tsx           # Filter controls
└── types.ts                      # TypeScript types
```

### Files to Modify
```
frontend/src/pages/ControlDetail.tsx  # Add M365 Settings tab
```

### API Integration
```
API Endpoints Used:
- GET /api/m365/control/:controlId/settings
- GET /api/m365/control/:controlId/compliance
```

---

## 🔨 STEP-BY-STEP IMPLEMENTATION

### Step 1: Create TypeScript Types

**File:** `frontend/src/components/M365Settings/types.ts`

```typescript
// TypeScript types for M365 Settings components

export interface M365Setting {
  id: string;
  displayName: string;
  description: string | null;
  policyType: string;
  platform: string | null;
  expectedValue: string | null;
  validationOperator: string | null;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  implementationGuide: string | null;
  microsoftDocsUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ControlSettingMapping {
  id: string;
  m365SettingId: string;
  controlId: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string | null;
  m365Setting: M365Setting;
  complianceCheck?: SettingComplianceCheck | null;
}

export interface SettingComplianceCheck {
  id: string;
  m365SettingId: string;
  m365PolicyId: string | null;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED';
  actualValue: string | null;
  expectedValue: string | null;
  lastChecked: string;
  validationDetails: any | null;
}

export interface ControlM365Compliance {
  controlId: string;
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  compliancePercentage: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  windowsCoverage: boolean;
  iosCoverage: boolean;
  androidCoverage: boolean;
  lastCalculated: string;
}

export interface M365SettingsResponse {
  mappings: ControlSettingMapping[];
  compliance: ControlM365Compliance | null;
}

export interface FilterState {
  policyType: string;
  platform: string;
  confidenceLevel: string;
  complianceStatus: string;
  searchQuery: string;
}

export interface GroupedSettings {
  HIGH: ControlSettingMapping[];
  MEDIUM: ControlSettingMapping[];
  LOW: ControlSettingMapping[];
}
```

**Purpose:** Type definitions for all M365 settings data structures and component props.

---

### Step 2: Create Compliance Status Badge Component

**File:** `frontend/src/components/M365Settings/ComplianceStatusBadge.tsx`

```typescript
import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface ComplianceStatusBadgeProps {
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED' | 'UNKNOWN';
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const ComplianceStatusBadge: React.FC<ComplianceStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'small',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLIANT':
        return {
          label: 'Compliant',
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" />,
          tooltip: 'This setting is configured correctly and meets the expected value.',
        };
      case 'NON_COMPLIANT':
        return {
          label: 'Non-Compliant',
          color: 'error' as const,
          icon: <CancelIcon fontSize="small" />,
          tooltip: 'This setting does not match the expected value. Action required.',
        };
      case 'NOT_CONFIGURED':
        return {
          label: 'Not Configured',
          color: 'warning' as const,
          icon: <HelpOutlineIcon fontSize="small" />,
          tooltip: 'This setting has not been configured in your M365 environment.',
        };
      case 'UNKNOWN':
      default:
        return {
          label: 'Unknown',
          color: 'default' as const,
          icon: <HelpOutlineIcon fontSize="small" />,
          tooltip: 'Compliance status has not been checked yet.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        icon={config.icon}
        label={showLabel ? config.label : undefined}
        color={config.color}
        size={size}
        variant="filled"
        sx={{
          fontWeight: 500,
          '& .MuiChip-icon': {
            marginLeft: 1,
          },
        }}
      />
    </Tooltip>
  );
};

export default ComplianceStatusBadge;
```

**Purpose:** Reusable badge component for displaying compliance status with appropriate colors and icons.

---

### Step 3: Create Setting Card Component

**File:** `frontend/src/components/M365Settings/SettingCard.tsx`

```typescript
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  Computer as ComputerIcon,
  PhoneIphone as PhoneIphoneIcon,
  PhoneAndroid as PhoneAndroidIcon,
} from '@mui/icons-material';
import ComplianceStatusBadge from './ComplianceStatusBadge';
import { ControlSettingMapping } from './types';

interface SettingCardProps {
  mapping: ControlSettingMapping;
  defaultExpanded?: boolean;
}

const SettingCard: React.FC<SettingCardProps> = ({ mapping, defaultExpanded = false }) => {
  const setting = mapping.m365Setting;
  const complianceCheck = mapping.complianceCheck;

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
      case 'HIGH':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format validation operator for display
  const formatOperator = (operator: string | null) => {
    if (!operator) return null;
    
    const operatorMap: { [key: string]: string } = {
      '==': 'Equals',
      '>=': 'Greater than or equal to',
      '<=': 'Less than or equal to',
      'contains': 'Contains',
      'in': 'Is one of',
      'matches': 'Matches pattern',
    };
    
    return operatorMap[operator] || operator;
  };

  // Get compliance status
  const getComplianceStatus = () => {
    if (!complianceCheck) return 'UNKNOWN';
    return complianceCheck.complianceStatus;
  };

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      sx={{
        bgcolor: 'background.paper',
        '&:before': {
          display: 'none',
        },
        mb: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, pr: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {setting.displayName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label={setting.policyType}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
              {setting.platform && (
                <Chip
                  icon={getPlatformIcon(setting.platform) || undefined}
                  label={setting.platform}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              <Chip
                label={`${mapping.confidenceLevel} Confidence`}
                size="small"
                color={getConfidenceColor(mapping.confidenceLevel) as any}
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ComplianceStatusBadge
              status={getComplianceStatus()}
              showLabel={false}
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Description */}
          {setting.description && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Description:</strong>
              </Typography>
              <Typography variant="body2">{setting.description}</Typography>
            </Box>
          )}

          <Divider />

          {/* Configuration Details */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Expected Configuration:</strong>
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {setting.validationOperator && (
                  <Typography variant="body2">
                    <strong>Operator:</strong> {formatOperator(setting.validationOperator)}
                  </Typography>
                )}
                {setting.expectedValue && (
                  <Typography variant="body2">
                    <strong>Value:</strong> <code>{setting.expectedValue}</code>
                  </Typography>
                )}
              </Box>
            </Grid>

            {complianceCheck && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Current Status:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ComplianceStatusBadge
                      status={complianceCheck.complianceStatus}
                      showLabel={true}
                    />
                  </Box>
                  {complianceCheck.actualValue && (
                    <Typography variant="body2">
                      <strong>Actual Value:</strong> <code>{complianceCheck.actualValue}</code>
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Last checked: {new Date(complianceCheck.lastChecked).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* Non-compliant warning */}
          {complianceCheck?.complianceStatus === 'NON_COMPLIANT' && (
            <Alert severity="error" variant="outlined">
              <Typography variant="body2">
                <strong>Action Required:</strong> This setting does not match the expected
                configuration. Update the setting in your M365 environment to achieve
                compliance.
              </Typography>
            </Alert>
          )}

          {/* Not configured info */}
          {complianceCheck?.complianceStatus === 'NOT_CONFIGURED' && (
            <Alert severity="warning" variant="outlined">
              <Typography variant="body2">
                <strong>Configuration Needed:</strong> This setting has not been configured
                in your M365 environment. Configure it to improve compliance.
              </Typography>
            </Alert>
          )}

          <Divider />

          {/* Implementation Guide */}
          {setting.implementationGuide && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Implementation Guide:</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  bgcolor: 'action.hover',
                  p: 1.5,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {setting.implementationGuide}
              </Typography>
            </Box>
          )}

          {/* Rationale */}
          {mapping.rationale && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Mapping Rationale:</strong>
              </Typography>
              <Typography variant="body2">{mapping.rationale}</Typography>
            </Box>
          )}

          {/* Microsoft Docs Link */}
          {setting.microsoftDocsUrl && (
            <Box>
              <Link
                href={setting.microsoftDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                View Microsoft Documentation
                <OpenInNewIcon fontSize="small" />
              </Link>
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default SettingCard;
```

**Purpose:** Displays individual M365 setting details with compliance status, configuration requirements, and implementation guidance.

---

### Step 4: Create Filter Controls Component

**File:** `frontend/src/components/M365Settings/SettingFilters.tsx`

```typescript
import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  Chip,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { FilterState } from './types';

interface SettingFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  policyTypes: string[];
  platforms: string[];
}

const SettingFilters: React.FC<SettingFiltersProps> = ({
  filters,
  onFilterChange,
  policyTypes,
  platforms,
}) => {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      policyType: 'all',
      platform: 'all',
      confidenceLevel: 'all',
      complianceStatus: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.policyType !== 'all' ||
      filters.platform !== 'all' ||
      filters.confidenceLevel !== 'all' ||
      filters.complianceStatus !== 'all' ||
      filters.searchQuery !== ''
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.policyType !== 'all') count++;
    if (filters.platform !== 'all') count++;
    if (filters.confidenceLevel !== 'all') count++;
    if (filters.complianceStatus !== 'all') count++;
    if (filters.searchQuery !== '') count++;
    return count;
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search settings..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250, flexGrow: 1 }}
        />

        {/* Policy Type */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Policy Type</InputLabel>
          <Select
            value={filters.policyType}
            label="Policy Type"
            onChange={(e) => handleFilterChange('policyType', e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {policyTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Platform */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Platform</InputLabel>
          <Select
            value={filters.platform}
            label="Platform"
            onChange={(e) => handleFilterChange('platform', e.target.value)}
          >
            <MenuItem value="all">All Platforms</MenuItem>
            {platforms.map((platform) => (
              <MenuItem key={platform} value={platform}>
                {platform}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Confidence Level */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Confidence</InputLabel>
          <Select
            value={filters.confidenceLevel}
            label="Confidence"
            onChange={(e) => handleFilterChange('confidenceLevel', e.target.value)}
          >
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="HIGH">High Confidence</MenuItem>
            <MenuItem value="MEDIUM">Medium Confidence</MenuItem>
            <MenuItem value="LOW">Low Confidence</MenuItem>
          </Select>
        </FormControl>

        {/* Compliance Status */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Compliance</InputLabel>
          <Select
            value={filters.complianceStatus}
            label="Compliance"
            onChange={(e) => handleFilterChange('complianceStatus', e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="COMPLIANT">Compliant</MenuItem>
            <MenuItem value="NON_COMPLIANT">Non-Compliant</MenuItem>
            <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Active filters summary */}
      {hasActiveFilters() && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${getActiveFilterCount()} filter${getActiveFilterCount() > 1 ? 's' : ''} active`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            sx={{ textTransform: 'none' }}
          >
            Clear All Filters
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SettingFilters;
```

**Purpose:** Provides comprehensive filtering controls for M365 settings including search, policy type, platform, confidence level, and compliance status filters.

---

### Step 5: Create Main M365 Settings Tab Component

**File:** `frontend/src/components/M365Settings/M365SettingsTab.tsx`

```typescript
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
```

**Purpose:** Main component that fetches and displays M365 settings for a control with filtering, grouping, and compliance summary.

---

### Step 6: Integrate M365 Settings Tab into Control Detail Page

**File:** `frontend/src/pages/ControlDetail.tsx`

**Modification Type:** Function-level replacement (adding new tab to existing tabs)

🔍 **FIND:** The Tabs and TabPanel section in ControlDetail.tsx

```typescript
<Tabs
  value={tabValue}
  onChange={handleTabChange}
  sx={{ borderBottom: 1, borderColor: 'divider' }}
>
  <Tab label="Overview" />
  <Tab label="Assessment" />
  <Tab label="Evidence" />
  <Tab label="POA&M" />
</Tabs>

{/* Tab Panels */}
<TabPanel value={tabValue} index={0}>
  {/* Overview content */}
</TabPanel>
<TabPanel value={tabValue} index={1}>
  {/* Assessment content */}
</TabPanel>
<TabPanel value={tabValue} index={2}>
  {/* Evidence content */}
</TabPanel>
<TabPanel value={tabValue} index={3}>
  {/* POA&M content */}
</TabPanel>
```

✏️ **REPLACE WITH:**

```typescript
<Tabs
  value={tabValue}
  onChange={handleTabChange}
  sx={{ borderBottom: 1, borderColor: 'divider' }}
>
  <Tab label="Overview" />
  <Tab label="Assessment" />
  <Tab label="Evidence" />
  <Tab label="POA&M" />
  <Tab label="M365 Settings" />
</Tabs>

{/* Tab Panels */}
<TabPanel value={tabValue} index={0}>
  {/* Overview content */}
</TabPanel>
<TabPanel value={tabValue} index={1}>
  {/* Assessment content */}
</TabPanel>
<TabPanel value={tabValue} index={2}>
  {/* Evidence content */}
</TabPanel>
<TabPanel value={tabValue} index={3}>
  {/* POA&M content */}
</TabPanel>
<TabPanel value={tabValue} index={4}>
  <M365SettingsTab controlId={controlId} />
</TabPanel>
```

**Also add the import at the top of the file:**

```typescript
import M365SettingsTab from '../components/M365Settings/M365SettingsTab';
```

---

## ✅ TESTING PROCEDURES

### Frontend Testing Checklist

#### 1. **Component Rendering**
- [ ] M365 Settings tab appears in Control Detail page
- [ ] Tab switches correctly without errors
- [ ] Loading spinner shows while fetching data
- [ ] Empty state displays when no settings exist
- [ ] Error message shows when API fails

#### 2. **Data Display**
- [ ] All settings display correctly grouped by confidence
- [ ] Setting cards show all required fields:
  - [ ] Display name and description
  - [ ] Policy type and platform badges
  - [ ] Confidence level badge
  - [ ] Compliance status badge
  - [ ] Expected value and operator
  - [ ] Implementation guide
  - [ ] Microsoft Docs link
- [ ] Compliance summary card shows correct counts
- [ ] Compliance percentage calculates correctly

#### 3. **Filtering**
- [ ] Search filter works across display name and description
- [ ] Policy type filter shows only matching settings
- [ ] Platform filter shows only matching settings
- [ ] Confidence level filter groups settings correctly
- [ ] Compliance status filter shows only matching statuses
- [ ] Multiple filters work together (AND logic)
- [ ] Clear filters button resets all filters
- [ ] Active filter count displays correctly

#### 4. **Interactions**
- [ ] Accordion sections expand and collapse
- [ ] Individual setting cards expand and collapse
- [ ] Expand All button opens all sections and cards
- [ ] Collapse All button closes all sections and cards
- [ ] Refresh button reloads data
- [ ] Microsoft Docs links open in new tab

#### 5. **Responsive Design**
- [ ] Layout works on desktop (>1200px)
- [ ] Layout works on tablet (768-1199px)
- [ ] Layout works on mobile (<768px)
- [ ] Filters stack appropriately on small screens
- [ ] Cards remain readable at all breakpoints

#### 6. **Performance**
- [ ] Page loads in <2 seconds with typical data
- [ ] Filtering is instant (<100ms)
- [ ] No console errors or warnings
- [ ] Memory usage is reasonable
- [ ] Large setting lists (>50) render smoothly

### Manual Testing Scenarios

#### Scenario 1: View Settings for Compliant Control
1. Navigate to a control with M365 settings
2. Click "M365 Settings" tab
3. **Expected:** See compliance summary with green indicators
4. **Expected:** Settings show compliant status

#### Scenario 2: View Settings for Non-Compliant Control
1. Navigate to a control with non-compliant settings
2. Click "M365 Settings" tab
3. **Expected:** See red non-compliant indicators
4. **Expected:** Warning alerts show on non-compliant settings

#### Scenario 3: Filter by Policy Type
1. Open M365 Settings tab
2. Select a specific policy type from dropdown
3. **Expected:** Only settings of that type display
4. **Expected:** Section counts update correctly

#### Scenario 4: Search for Specific Setting
1. Open M365 Settings tab
2. Type "password" in search box
3. **Expected:** Only settings with "password" in name/description show
4. **Expected:** Highlighting shows matched text

#### Scenario 5: Expand/Collapse All
1. Open M365 Settings tab
2. Click "Collapse All"
3. **Expected:** All accordion sections close
4. Click "Expand All"
5. **Expected:** All accordion sections open

#### Scenario 6: No Settings Scenario
1. Navigate to a control with no M365 settings
2. Click "M365 Settings" tab
3. **Expected:** Info message explains no settings available
4. **Expected:** Helpful guidance text provided

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### Issue: "Failed to load M365 settings"
**Symptoms:** Error message in tab, red alert box  
**Causes:**
- Backend API not running
- Phase 5 endpoints not implemented
- Database connection issue
- Invalid control ID

**Solutions:**
1. Verify backend server is running on correct port
2. Check Phase 5 API endpoints are implemented
3. Test API endpoint directly: `GET /api/m365/control/:controlId/settings`
4. Check browser console for detailed error messages
5. Verify control ID exists in database

#### Issue: No settings display but no error
**Symptoms:** Empty state message when settings should exist  
**Causes:**
- No mappings in database
- Phase 2 import not completed
- Control has no mapped settings

**Solutions:**
1. Verify Phase 2 import completed successfully
2. Check database: `SELECT COUNT(*) FROM ControlSettingMapping WHERE controlId = ?`
3. Run validation script from Phase 2
4. Check import logs for errors

#### Issue: Compliance status not showing
**Symptoms:** All settings show "Unknown" status  
**Causes:**
- Phase 6 policy sync not implemented
- No compliance checks run yet
- SettingComplianceCheck table empty

**Solutions:**
1. Run policy sync if Phase 6 is complete
2. Check SettingComplianceCheck table has data
3. Manually trigger compliance calculation
4. Verify Phase 3-4 services are implemented

#### Issue: Filters not working
**Symptoms:** Filter changes have no effect  
**Causes:**
- JavaScript errors in filtering logic
- State not updating correctly
- Memo dependencies incorrect

**Solutions:**
1. Check browser console for errors
2. Verify filter state updates in React DevTools
3. Check useMemo dependencies array
4. Test filters individually to isolate issue

#### Issue: Slow performance with many settings
**Symptoms:** Page lags when filtering or scrolling  
**Causes:**
- Too many settings rendering at once
- Re-renders not optimized
- Large data payloads

**Solutions:**
1. Implement virtualization for long lists
2. Add React.memo to SettingCard component
3. Optimize filter logic with better indexing
4. Consider pagination for >100 settings

#### Issue: Dark theme styling issues
**Symptoms:** Colors don't match application theme  
**Causes:**
- Hard-coded colors instead of theme variables
- Missing MUI theme context
- Wrong color variants

**Solutions:**
1. Use theme palette colors: `theme.palette.primary.main`
2. Verify ThemeProvider wraps components
3. Use MUI color prop variants: `color="primary"`
4. Check custom sx prop overrides

---

## 📊 VERIFICATION CHECKLIST

### Pre-Implementation
- [ ] Phase 1 complete (database schema exists)
- [ ] Phase 2 complete (data imported)
- [ ] Phase 5 complete (API endpoints available)
- [ ] Backend server running
- [ ] Frontend development server running

### Post-Implementation
- [ ] All TypeScript files compile without errors
- [ ] No console errors when opening tab
- [ ] All components render correctly
- [ ] Filters work as expected
- [ ] Compliance data displays correctly
- [ ] Loading states appear appropriately
- [ ] Error handling works
- [ ] Mobile responsive design verified
- [ ] Performance acceptable (<2s load time)
- [ ] Browser tested: Chrome, Firefox, Safari, Edge

### Integration Points
- [ ] API calls return expected data structure
- [ ] Axios configured with correct base URL
- [ ] Authentication tokens passed correctly (if required)
- [ ] Error responses handled gracefully
- [ ] Data refreshes correctly after policy sync

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] ESLint shows no errors
- [ ] Components properly typed
- [ ] Props interfaces defined
- [ ] No `any` types used (except where necessary)
- [ ] Comments added for complex logic
- [ ] Consistent naming conventions
- [ ] Proper error boundaries

---

## 🎯 SUCCESS CRITERIA

### Phase 7 Complete When:
1. ✅ M365 Settings tab visible on all control pages
2. ✅ Settings display grouped by confidence level
3. ✅ Filtering works for all filter types
4. ✅ Compliance summary shows correct data
5. ✅ Setting cards show all required information
6. ✅ Loading states implemented
7. ✅ Empty states implemented
8. ✅ Error handling implemented
9. ✅ Responsive design works on all devices
10. ✅ Dark theme consistent throughout
11. ✅ No TypeScript errors
12. ✅ No console errors or warnings
13. ✅ Performance acceptable (<2s load)
14. ✅ All manual test scenarios pass

---

## 📚 RELATED DOCUMENTATION

### Previous Phases
- Phase 1: Database Schema Migration
- Phase 2: Database Import & Seeding
- Phase 5: M365 Settings API Endpoints

### Next Phases
- Phase 8: Compliance Summary Components (enhances this UI)
- Phase 9: Control Library M365 Integration (uses similar patterns)
- Phase 10: Gap Analysis Updates (consumes same APIs)

### Technical References
- Material-UI Documentation: https://mui.com/
- React TypeScript: https://react-typescript-cheatsheet.netlify.app/
- Axios Documentation: https://axios-http.com/docs/intro

---

## 🎓 LEARNING NOTES

### Key Patterns Used

#### 1. Grouped Accordion Display
Settings are organized by confidence level (High/Medium/Low) using nested accordions:
- Outer accordion for confidence groups
- Inner accordion for individual settings
- Provides clear hierarchy and progressive disclosure

#### 2. Comprehensive Filtering
Multi-dimensional filtering system:
- Text search (fuzzy matching across fields)
- Category filters (policy type, platform)
- Metadata filters (confidence, compliance status)
- Filters combine with AND logic
- Active filter summary for user awareness

#### 3. Memoized Computations
Expensive operations memoized with `useMemo`:
- Filter unique values (policy types, platforms)
- Apply all filters to settings
- Group filtered results by confidence
- Prevents unnecessary recalculations on re-render

#### 4. Conditional Rendering
Smart display logic based on data state:
- Loading spinner while fetching
- Error alert with retry button
- Empty state when no mappings
- No results when filters exclude everything
- Normal view when data available

#### 5. Responsive Design
Mobile-first approach with breakpoints:
- Grid system for setting details (12-column)
- Horizontal scrolling for long content
- Stacked filters on mobile
- Touch-friendly tap targets (44px minimum)

### Performance Considerations

#### Current Implementation
- Direct rendering of all filtered settings
- Suitable for <100 settings per control
- Simple array filtering
- No pagination

#### Future Optimizations (if needed)
- Virtual scrolling for >100 settings
- React.memo on SettingCard for render optimization
- Pagination or "Load More" button
- Server-side filtering for very large datasets
- Debounced search input

### Accessibility Features
- Semantic HTML (proper heading hierarchy)
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in accordions
- Color contrast meets WCAG AA
- Screen reader friendly status badges

---

## 🚀 NEXT STEPS

After completing Phase 7:

### Immediate
1. Test the M365 Settings tab with real data
2. Gather user feedback on layout and usability
3. Document any bugs or issues found
4. Verify integration with existing control pages

### Phase 8 Preparation
Phase 8 (Compliance Summary Components) will:
- Add more visual compliance indicators
- Create reusable summary cards
- Enhance the compliance summary shown in this tab
- Add charts and progress visualizations

Consider what additional data visualization would be helpful!

### Long-term Enhancements
- Export settings list to CSV/PDF
- Bulk update compliance status
- Setting comparison view
- Historical compliance trending
- Mobile app optimization

---

## 📝 IMPLEMENTATION NOTES

### For Claude Code
This phase focuses on **frontend React components only**. Key considerations:

1. **Component Structure:** Each component is self-contained with clear props interfaces
2. **Data Flow:** Props flow down, events bubble up (standard React pattern)
3. **State Management:** Local state with useState, computed values with useMemo
4. **API Integration:** Direct axios calls (no Redux/Context needed yet)
5. **Styling:** Material-UI components with sx prop for customization
6. **TypeScript:** Strict typing throughout, interfaces for all data structures

### Code Organization Tips
```
M365Settings/
├── types.ts                    # Share types across components
├── M365SettingsTab.tsx         # Container component (data fetching)
├── SettingFilters.tsx          # Stateless, receives props
├── SettingCard.tsx             # Stateless, receives props
└── ComplianceStatusBadge.tsx   # Pure display component
```

This structure promotes:
- Code reusability
- Easy testing
- Clear separation of concerns
- Maintainability

---

**Phase 7 Version:** 1.0  
**Created:** 2024-11-17  
**Status:** Ready for Implementation  
**Estimated Completion:** 3-4 hours

---

**END OF PHASE 7 IMPLEMENTATION GUIDE**
