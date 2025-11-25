# Policy Control Mappings Tab - Implementation Guide

## Overview

This guide implements a new tab in the Policy Viewer's PolicyDetailModal that displays **policy settings mapped to controls** (inverse of the current control-to-policy view). Users can filter by policy type, platform, control priority, control family, and compliance status, with toggle between table/card views.

---

## Phase 1: Backend API Development

### 1.1 Create New API Endpoint

**File**: `server/src/routes/m365.routes.ts`

**Location**: Add this endpoint after the existing `/policies/viewer/:id/control-mappings` endpoint (around line 180)

```typescript
/**
 * GET /api/m365/policies/viewer/:id/settings-to-controls
 * Get all policy settings that are mapped to controls for a specific policy
 * Shows the inverse relationship - settings → controls
 */
router.get('/policies/viewer/:id/settings-to-controls', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    // Verify policy exists
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: { id: true, policyName: true, policyType: true },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Get all compliance checks for this policy that have settings mapped to controls
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId,
        setting: {
          controlMappings: {
            some: {}, // Only include settings that ARE mapped to at least one control
          },
        },
      },
      include: {
        setting: {
          include: {
            controlMappings: {
              include: {
                control: {
                  select: {
                    id: true,
                    controlId: true,
                    title: true,
                    family: true,
                    priority: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        setting: {
          displayName: 'asc',
        },
      },
    });

    // Transform the data into a more frontend-friendly format
    const settingsWithControls = complianceChecks.map((check) => ({
      // Setting metadata
      id: check.id,
      settingId: check.settingId,
      settingName: check.setting.displayName,
      settingDescription: check.setting.description,
      settingPath: check.setting.settingPath,
      policyType: check.setting.policyType,
      platform: check.setting.platform,
      
      // Compliance data
      expectedValue: check.expectedValue,
      actualValue: check.actualValue,
      isCompliant: check.isCompliant,
      complianceMessage: check.complianceMessage,
      complianceStatus: check.isCompliant 
        ? 'COMPLIANT' 
        : check.actualValue === null || check.actualValue === 'null'
        ? 'NOT_CONFIGURED'
        : 'NON_COMPLIANT',
      lastChecked: check.lastChecked,
      
      // Validation details
      validationOperator: check.setting.validationOperator,
      implementationGuide: check.setting.implementationGuide,
      microsoftDocsUrl: check.setting.microsoftDocsUrl,
      
      // Confidence
      confidence: check.setting.confidence || 'Unknown',
      
      // Mapped controls (multiple controls can be mapped to one setting)
      mappedControls: check.setting.controlMappings.map((mapping) => ({
        controlId: mapping.control.controlId,
        controlTitle: mapping.control.title,
        controlFamily: mapping.control.family,
        controlPriority: mapping.control.priority,
        mappingConfidence: mapping.confidence,
        mappingRationale: mapping.mappingRationale,
        isRequired: mapping.isRequired,
      })),
    }));

    // Calculate summary statistics
    const summary = {
      total: settingsWithControls.length,
      compliant: settingsWithControls.filter((s) => s.complianceStatus === 'COMPLIANT').length,
      nonCompliant: settingsWithControls.filter((s) => s.complianceStatus === 'NON_COMPLIANT').length,
      notConfigured: settingsWithControls.filter((s) => s.complianceStatus === 'NOT_CONFIGURED').length,
      
      // Breakdown by control priority
      byPriority: {
        critical: settingsWithControls.filter((s) => 
          s.mappedControls.some((c) => c.controlPriority === 'Critical')
        ).length,
        high: settingsWithControls.filter((s) => 
          s.mappedControls.some((c) => c.controlPriority === 'High')
        ).length,
        medium: settingsWithControls.filter((s) => 
          s.mappedControls.some((c) => c.controlPriority === 'Medium')
        ).length,
        low: settingsWithControls.filter((s) => 
          s.mappedControls.some((c) => c.controlPriority === 'Low')
        ).length,
      },
      
      // Breakdown by control family
      byFamily: settingsWithControls.reduce((acc, setting) => {
        setting.mappedControls.forEach((control) => {
          acc[control.controlFamily] = (acc[control.controlFamily] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      
      // Breakdown by platform
      byPlatform: settingsWithControls.reduce((acc, setting) => {
        acc[setting.platform] = (acc[setting.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.policyName,
        type: policy.policyType,
      },
      settings: settingsWithControls,
      summary,
    });
  } catch (error) {
    console.error('Error fetching policy settings-to-controls:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

### 1.2 Test the API Endpoint

**File**: `server/tests/policyViewer.http`

**Add these test cases at the end of the file:**

```http
# ============================================================================
# Policy Settings to Controls Mapping Endpoint
# ============================================================================

### Get settings-to-controls for policy ID 1
GET http://localhost:3001/api/m365/policies/viewer/1/settings-to-controls

### Get settings-to-controls for policy ID 2
GET http://localhost:3001/api/m365/policies/viewer/2/settings-to-controls

### Get settings-to-controls for policy ID 3
GET http://localhost:3001/api/m365/policies/viewer/3/settings-to-controls

### Test with non-existent policy ID
GET http://localhost:3001/api/m365/policies/viewer/99999/settings-to-controls
```

**Verification Steps:**
1. Start the backend: `npm run dev` (in server directory)
2. Test each endpoint using VS Code REST Client or Postman
3. Verify response structure includes:
   - `settings` array with setting details and `mappedControls`
   - `summary` object with totals by priority, family, platform, and compliance status
4. Confirm error handling for non-existent policy IDs

---

## Phase 2: Frontend Types

### 2.1 Update Policy Viewer Types

**File**: `client/src/types/policyViewer.types.ts`

**Add these new interfaces at the end of the file:**

```typescript
// ============================================================================
// Policy Settings to Controls Types (Inverse Mapping)
// ============================================================================

export interface PolicySettingToControl {
  // Setting metadata
  id: number;
  settingId: number;
  settingName: string;
  settingDescription: string | null;
  settingPath: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  platform: string;
  
  // Compliance data
  expectedValue: string;
  actualValue: string | null;
  isCompliant: boolean;
  complianceMessage: string | null;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED';
  lastChecked: string;
  
  // Validation details
  validationOperator: string | null;
  implementationGuide: string | null;
  microsoftDocsUrl: string | null;
  
  // Confidence
  confidence: 'High' | 'Medium' | 'Low' | 'Unknown';
  
  // Mapped controls
  mappedControls: MappedControlForSetting[];
}

export interface MappedControlForSetting {
  controlId: string; // e.g., "03.01.01"
  controlTitle: string;
  controlFamily: string; // e.g., "AC"
  controlPriority: 'Critical' | 'High' | 'Medium' | 'Low';
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingRationale: string | null;
  isRequired: boolean;
}

export interface PolicySettingsToControlsSummary {
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
  byFamily: Record<string, number>;
  byPlatform: Record<string, number>;
}

export interface PolicySettingsToControlsResponse {
  success: boolean;
  policy: {
    id: number;
    name: string;
    type: 'Intune' | 'Purview' | 'AzureAD';
  };
  settings: PolicySettingToControl[];
  summary: PolicySettingsToControlsSummary;
}

// Filter types for the new tab
export interface SettingsToControlsFilters {
  searchQuery: string;
  policyType: string; // 'all' | specific type
  platform: string; // 'all' | specific platform
  controlPriority: string; // 'all' | 'Critical' | 'High' | 'Medium' | 'Low'
  controlFamily: string; // 'all' | family code
  complianceStatus: string; // 'all' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED'
}

export type ViewMode = 'table' | 'card';
```

---

## Phase 3: Frontend Service Layer

### 3.1 Update Policy Viewer Service

**File**: `client/src/services/policyViewer.service.ts`

**Add this new method at the end of the class (before the export):**

```typescript
  /**
   * Get settings-to-controls mapping for a policy
   * Shows which settings from this policy are mapped to controls
   * 
   * @param policyId - The policy ID
   * @returns Promise with settings and their mapped controls
   */
  async getPolicySettingsToControls(
    policyId: number
  ): Promise<PolicySettingsToControlsResponse> {
    const response = await apiClient.get<PolicySettingsToControlsResponse>(
      `${this.API_BASE}/policies/viewer/${policyId}/settings-to-controls`
    );
    return response.data;
  }
```

**Also add the import at the top:**

```typescript
import type {
  // ... existing imports
  PolicySettingsToControlsResponse,
} from '../types/policyViewer.types';
```

---

## Phase 4: Reusable Filter Components

### 4.1 Create Settings-to-Controls Filter Component

**File**: `client/src/components/policy-viewer/SettingsToControlsFilters.tsx`

**Create new file with this content:**

```typescript
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SettingsToControlsFilters } from '@/types/policyViewer.types';

interface SettingsToControlsFiltersProps {
  filters: SettingsToControlsFilters;
  onFilterChange: (filters: SettingsToControlsFilters) => void;
  availablePlatforms: string[];
  availableFamilies: string[];
}

const SettingsToControlsFiltersComponent: React.FC<SettingsToControlsFiltersProps> = ({
  filters,
  onFilterChange,
  availablePlatforms,
  availableFamilies,
}) => {
  const handleFilterChange = (
    field: keyof SettingsToControlsFilters,
    value: string
  ) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
        p: 2,
        bgcolor: '#2C2C2C',
        borderRadius: 1,
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

      {/* Policy Type - REMOVED since we're already in a specific policy context */}

      {/* Platform */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Platform</InputLabel>
        <Select
          value={filters.platform}
          label="Platform"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('platform', e.target.value)
          }
        >
          <MenuItem value="all">All Platforms</MenuItem>
          {availablePlatforms.map((platform) => (
            <MenuItem key={platform} value={platform}>
              {platform}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Control Priority */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.controlPriority}
          label="Priority"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('controlPriority', e.target.value)
          }
        >
          <MenuItem value="all">All Priorities</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </Select>
      </FormControl>

      {/* Control Family */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Family</InputLabel>
        <Select
          value={filters.controlFamily}
          label="Family"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('controlFamily', e.target.value)
          }
        >
          <MenuItem value="all">All Families</MenuItem>
          {availableFamilies.sort().map((family) => (
            <MenuItem key={family} value={family}>
              {family}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Compliance Status */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Compliance Status</InputLabel>
        <Select
          value={filters.complianceStatus}
          label="Compliance Status"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('complianceStatus', e.target.value)
          }
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="COMPLIANT">Compliant</MenuItem>
          <MenuItem value="NON_COMPLIANT">Non-Compliant</MenuItem>
          <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default SettingsToControlsFiltersComponent;
```

---

## Phase 5: Main Tab Component

### 5.1 Create Settings-to-Controls Tab Component

**File**: `client/src/components/policy-viewer/SettingsToControlsTab.tsx`

**Create new file with this content:**

```typescript
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
import { useQuery } from '@tanstack/react-query';
import policyViewerService from '@/services/policyViewer.service';
import SettingsToControlsFiltersComponent from './SettingsToControlsFilters';
import {
  PolicySettingToControl,
  SettingsToControlsFilters,
  ViewMode,
} from '@/types/policyViewer.types';

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
}> = ({ setting, onNavigateToControl }) => {
  const [open, setOpen] = useState(false);

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
}> = ({ setting, onNavigateToControl }) => {
  const [expanded, setExpanded] = useState(false);

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
              <SettingCard setting={setting} onNavigateToControl={handleNavigateToControl} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SettingsToControlsTab;
```

---

## Phase 6: Integrate into Policy Detail Modal

### 6.1 Update PolicyDetailModal Component

**File**: `client/src/components/policy-viewer/PolicyDetailModal.tsx`

🔍 **FIND:**
```typescript
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="policy detail tabs">
            <Tab label="Overview" id="policy-tab-0" aria-controls="policy-tabpanel-0" />
            <Tab label="Raw Data" id="policy-tab-1" aria-controls="policy-tabpanel-1" />
            <Tab label="Control Mappings" id="policy-tab-2" aria-controls="policy-tabpanel-2" />
          </Tabs>
        </Box>
```

✏️ **REPLACE WITH:**
```typescript
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="policy detail tabs">
            <Tab label="Overview" id="policy-tab-0" aria-controls="policy-tabpanel-0" />
            <Tab label="Raw Data" id="policy-tab-1" aria-controls="policy-tabpanel-1" />
            <Tab label="Control Mappings" id="policy-tab-2" aria-controls="policy-tabpanel-2" />
            <Tab label="Settings → Controls" id="policy-tab-3" aria-controls="policy-tabpanel-3" />
          </Tabs>
        </Box>
```

🔍 **FIND:**
```typescript
        {/* Control Mappings Tab */}
        <TabPanel value={tabValue} index={2}>
          <ControlMappingsTab policyId={policy.id} />
        </TabPanel>
      </DialogContent>
```

✏️ **REPLACE WITH:**
```typescript
        {/* Control Mappings Tab */}
        <TabPanel value={tabValue} index={2}>
          <ControlMappingsTab policyId={policy.id} />
        </TabPanel>

        {/* Settings to Controls Tab */}
        <TabPanel value={tabValue} index={3}>
          <SettingsToControlsTab policyId={policy.id} />
        </TabPanel>
      </DialogContent>
```

🔍 **FIND (at the top imports):**
```typescript
import ControlMappingsTab from './ControlMappingsTab';
```

✏️ **REPLACE WITH:**
```typescript
import ControlMappingsTab from './ControlMappingsTab';
import SettingsToControlsTab from './SettingsToControlsTab';
```

---

## Phase 7: Testing & Verification

### 7.1 Backend Testing Checklist

**Start Backend:**
```bash
cd server
npm run dev
```

**Test API Endpoints:**
1. Open `server/tests/policyViewer.http` in VS Code
2. Test the new `/settings-to-controls` endpoint with various policy IDs
3. Verify response structure includes:
   - Settings array with all required fields
   - Mapped controls with priority and family
   - Summary statistics
4. Test error handling with non-existent policy ID

**Expected Response Structure:**
```json
{
  "success": true,
  "policy": { "id": 1, "name": "...", "type": "Intune" },
  "settings": [
    {
      "settingName": "...",
      "complianceStatus": "COMPLIANT",
      "mappedControls": [
        {
          "controlId": "03.01.01",
          "controlPriority": "Critical",
          "controlFamily": "AC"
        }
      ]
    }
  ],
  "summary": {
    "total": 10,
    "compliant": 5,
    "byPriority": { "critical": 3 },
    "byFamily": { "AC": 2 }
  }
}
```

### 7.2 Frontend Testing Checklist

**Start Frontend:**
```bash
cd client
npm run dev
```

**Test New Tab:**
1. Navigate to Policy Viewer (`/policy-viewer`)
2. Click on any policy card to open PolicyDetailModal
3. Click the new "Settings → Controls" tab (4th tab)
4. Verify the following:

**Visual Checks:**
- [ ] Summary section displays with compliance statistics
- [ ] Compliance percentage bar shows correct color (green/yellow/red)
- [ ] Filter bar renders with all 5 filters (Search, Platform, Priority, Family, Status)
- [ ] View toggle buttons (Table/Card) are visible and functional

**Table View:**
- [ ] Settings display in expandable table rows
- [ ] Header columns show correctly
- [ ] Clicking expand icon shows full details
- [ ] Control badges are visible and colored by priority
- [ ] Clicking control badge navigates to control detail page

**Card View:**
- [ ] Toggle to card view works
- [ ] Settings display in responsive grid
- [ ] Cards show key info at glance
- [ ] Expand/collapse functionality works
- [ ] Control badges are clickable

**Filter Functionality:**
- [ ] Search filters by setting name, description, path
- [ ] Platform filter works (test with different platforms)
- [ ] Priority filter shows only settings with matching priority controls
- [ ] Family filter shows only settings with matching family controls
- [ ] Status filter shows only settings with matching compliance status
- [ ] Multiple filters work together
- [ ] "No results" message shows when filters return nothing
- [ ] Results count updates correctly

**Navigation:**
- [ ] Clicking control badge navigates to `/controls/{controlId}?tab=m365`
- [ ] Back button returns to policy viewer

### 7.3 Edge Cases to Test

1. **Policy with no mapped settings:**
   - Should show info message about no mappings
   
2. **Policy with many settings:**
   - Should handle 50+ settings smoothly
   - Table/card views should be performant
   
3. **Settings with multiple controls:**
   - Should show all control badges
   - Badges should be properly colored by priority
   
4. **Settings with long values:**
   - Should truncate in table view
   - Should show full values in expanded view
   
5. **Mixed compliance statuses:**
   - Summary should correctly count each status
   - Progress bar should calculate percentage correctly

### 7.4 Mobile Responsiveness

Test on mobile viewport (375px width):
- [ ] Filters stack vertically
- [ ] Cards display single column
- [ ] Table scrolls horizontally
- [ ] Touch interactions work for expand/collapse
- [ ] Control badges are tappable

---

## Phase 8: Optional Enhancements

### 8.1 Export Functionality (Future)

Add export button to summary section to download filtered settings as CSV/Excel.

### 8.2 Bulk Actions (Future)

Add checkboxes to select multiple settings for bulk operations (e.g., mark as reviewed).

### 8.3 Sort Options (Future)

Add sorting by:
- Setting name
- Compliance status
- Priority level
- Last checked date

### 8.4 Advanced Filters (Future)

Add filters for:
- Validation operator type
- Confidence level
- Required vs optional settings
- Date range for last checked

---

## Troubleshooting Guide

### Issue: API returns empty settings array

**Cause:** Policy exists but has no compliance checks, or settings aren't mapped to controls

**Solution:**
1. Run policy sync: POST to `/api/m365/sync`
2. Run auto-mapping: Check that `ControlSettingMapping` table has entries
3. Verify `SettingComplianceCheck` table has entries for this policy

### Issue: Control badges don't navigate

**Cause:** Navigation URL is incorrect or control doesn't exist

**Solution:**
1. Check control ID format (should be like "03.01.01")
2. Verify control exists in database
3. Check browser console for navigation errors
4. Verify route matches pattern in `client/src/routes/index.tsx`

### Issue: Filters not working

**Cause:** Filter logic doesn't match data structure

**Solution:**
1. Console log `filteredSettings` to see what's being filtered
2. Check that filter values match data exactly (case-sensitive)
3. Verify `useMemo` dependencies include all filter states

### Issue: Performance issues with many settings

**Cause:** Re-rendering too frequently or filtering not optimized

**Solution:**
1. Verify `useMemo` is used for filtered data
2. Add React.memo to SettingRow/SettingCard components
3. Consider virtualization for 100+ settings

### Issue: TypeScript errors

**Cause:** Type definitions don't match API response

**Solution:**
1. Verify API response structure matches types in `policyViewer.types.ts`
2. Check all required fields are present
3. Update types if API structure changed

---

## Summary & Next Steps

### What Was Built

1. **Backend API** (`/api/m365/policies/viewer/:id/settings-to-controls`)
   - Returns policy settings with their mapped controls
   - Includes compliance status and statistics
   - Supports filtering data preparation

2. **Frontend Components:**
   - `SettingsToControlsTab` - Main tab component with table/card views
   - `SettingsToControlsFilters` - Reusable filter component
   - Integration into `PolicyDetailModal`

3. **Features:**
   - View toggle (table/card)
   - 5 filter options (Search, Platform, Priority, Family, Status)
   - Compliance summary with statistics
   - Clickable control badges for navigation
   - Expandable details with implementation guides
   - Responsive design

### Files Modified

- `server/src/routes/m365.routes.ts` - New API endpoint
- `server/tests/policyViewer.http` - API tests
- `client/src/types/policyViewer.types.ts` - New type definitions
- `client/src/services/policyViewer.service.ts` - New service method
- `client/src/components/policy-viewer/SettingsToControlsTab.tsx` - New component
- `client/src/components/policy-viewer/SettingsToControlsFilters.tsx` - New component
- `client/src/components/policy-viewer/PolicyDetailModal.tsx` - Added new tab

### Testing Commands

```bash
# Backend
cd server
npm run dev
# Test with server/tests/policyViewer.http

# Frontend
cd client
npm run dev
# Navigate to /policy-viewer and test new tab
```

### Success Criteria

✅ New "Settings → Controls" tab appears in PolicyDetailModal
✅ Settings display with mapped control badges
✅ Filters work correctly for all 5 filter types
✅ Table and card views both function properly
✅ Clicking control badges navigates to control detail page
✅ Compliance summary displays accurate statistics
✅ No console errors or warnings
✅ Mobile responsive design works

---

## Implementation Timeline

**Estimated Time: 3-4 hours**

- Phase 1 (Backend): 45 minutes
- Phase 2 (Types): 15 minutes
- Phase 3 (Service): 15 minutes
- Phase 4 (Filters): 30 minutes
- Phase 5 (Main Tab): 60 minutes
- Phase 6 (Integration): 15 minutes
- Phase 7 (Testing): 45 minutes

---

## Support & Questions

If you encounter issues during implementation:

1. Check the Troubleshooting Guide section above
2. Verify all dependencies are installed (`npm install` in both client and server)
3. Ensure database migrations are up to date
4. Check browser console and server logs for errors
5. Verify TypeScript compilation succeeds (`npm run build`)

**Good luck with your implementation! 🚀**
