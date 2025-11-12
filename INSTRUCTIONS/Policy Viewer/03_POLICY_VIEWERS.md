# Phase 3: Policy Type Viewers

## Overview
Build policy-type-specific card components to display Intune, Purview, and Azure AD policy details in formatted, readable layouts. Create a detailed policy modal for expanded views.

## Prerequisites
- Phase 1 (Backend API) completed
- Phase 2 (Frontend Components) completed
- Policy data available via API

---

## Step 1: Create Base Policy Card Component

📁 **File:** `client/src/components/policy-viewer/BasePolicyCard.tsx`

```typescript
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail } from '../../types/policyViewer.types';

interface BasePolicyCardProps {
  policy: PolicyDetail;
  accentColor: string;
  onOpenDetail: (policy: PolicyDetail) => void;
  children: React.ReactNode;
}

const BasePolicyCard: React.FC<BasePolicyCardProps> = ({
  policy,
  accentColor,
  onOpenDetail,
  children,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${accentColor}`,
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {policy.policyName}
            </Typography>
            {policy.policyDescription && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {policy.policyDescription}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            <Chip
              label={policy.policyType}
              size="small"
              sx={{
                bgcolor: accentColor,
                color: 'white',
              }}
            />
            <Tooltip title={policy.isActive ? 'Active' : 'Inactive'}>
              {policy.isActive ? (
                <ActiveIcon color="success" />
              ) : (
                <InactiveIcon color="disabled" />
              )}
            </Tooltip>
          </Box>
        </Box>

        {/* Metadata */}
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          <Typography variant="caption" color="text.secondary">
            Last synced: {formatDistanceToNow(new Date(policy.lastSynced), { addSuffix: true })}
          </Typography>
          {policy.parsedData.createdDateTime && (
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(policy.parsedData.createdDateTime).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Mapped Controls */}
        {policy.mappedControls.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Mapped NIST Controls:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {policy.mappedControls.map((control) => (
                <Tooltip
                  key={control.controlId}
                  title={`${control.controlTitle} (${control.mappingConfidence} confidence)`}
                >
                  <Chip
                    label={control.controlId}
                    size="small"
                    variant="outlined"
                    color={
                      control.mappingConfidence === 'High'
                        ? 'success'
                        : control.mappingConfidence === 'Medium'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}

        {/* Expandable Details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          {children}
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label="show more"
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: '0.3s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
        <Tooltip title="View full details">
          <IconButton onClick={() => onOpenDetail(policy)} size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default BasePolicyCard;
```

---

## Step 2: Create Intune Policy Card

📁 **File:** `client/src/components/policy-viewer/IntunePolicyCard.tsx`

```typescript
import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import BasePolicyCard from './BasePolicyCard';
import { PolicyDetail } from '../../types/policyViewer.types';

interface IntunePolicyCardProps {
  policy: PolicyDetail;
  onOpenDetail: (policy: PolicyDetail) => void;
}

const IntunePolicyCard: React.FC<IntunePolicyCardProps> = ({ policy, onOpenDetail }) => {
  const settings = policy.parsedData.settings;

  const renderBooleanSetting = (label: string, value: boolean | undefined) => {
    if (value === undefined) return null;
    return (
      <Grid item xs={12} sm={6}>
        <Box display="flex" alignItems="center" gap={1}>
          {value ? (
            <CheckIcon color="success" fontSize="small" />
          ) : (
            <CloseIcon color="error" fontSize="small" />
          )}
          <Typography variant="body2">{label}</Typography>
        </Box>
      </Grid>
    );
  };

  const renderTextSetting = (label: string, value: any) => {
    if (!value) return null;
    return (
      <Grid item xs={12} sm={6}>
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {value}
        </Typography>
      </Grid>
    );
  };

  return (
    <BasePolicyCard
      policy={policy}
      accentColor="#42A5F5"
      onOpenDetail={onOpenDetail}
    >
      <Box>
        <Typography variant="subtitle2" gutterBottom color="primary">
          Policy Settings
        </Typography>

        {policy.parsedData.platformType && (
          <Chip
            label={`Platform: ${policy.parsedData.platformType}`}
            size="small"
            sx={{ mb: 2 }}
          />
        )}

        <Grid container spacing={2}>
          {/* Password Settings */}
          {renderBooleanSetting('Password Required', settings.passwordRequired)}
          {renderTextSetting('Min Password Length', settings.passwordMinimumLength)}

          {/* Device Health */}
          {renderBooleanSetting('Require Healthy Device', settings.requireHealthyDeviceReport)}

          {/* OS Version */}
          {renderTextSetting('Minimum OS Version', settings.osMinimumVersion)}
          {renderTextSetting('Maximum OS Version', settings.osMaximumVersion)}

          {/* Encryption */}
          {renderBooleanSetting('BitLocker Enabled', settings.bitLockerEnabled)}
          {renderBooleanSetting('Storage Encryption', settings.storageRequireEncryption)}

          {/* Firewall */}
          {renderBooleanSetting('Firewall Enabled', settings.firewallEnabled)}
        </Grid>

        {Object.keys(settings).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No detailed settings available for this policy type.
          </Typography>
        )}
      </Box>
    </BasePolicyCard>
  );
};

export default IntunePolicyCard;
```

---

## Step 3: Create Purview Policy Card

📁 **File:** `client/src/components/policy-viewer/PurviewPolicyCard.tsx`

```typescript
import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import BasePolicyCard from './BasePolicyCard';
import { PolicyDetail } from '../../types/policyViewer.types';

interface PurviewPolicyCardProps {
  policy: PolicyDetail;
  onOpenDetail: (policy: PolicyDetail) => void;
}

const PurviewPolicyCard: React.FC<PurviewPolicyCardProps> = ({ policy, onOpenDetail }) => {
  const settings = policy.parsedData.settings;

  const renderSetting = (label: string, value: any) => {
    if (value === undefined || value === null) return null;

    let displayValue = value;
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }

    return (
      <Grid item xs={12} sm={6}>
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {displayValue}
        </Typography>
      </Grid>
    );
  };

  return (
    <BasePolicyCard
      policy={policy}
      accentColor="#AB47BC"
      onOpenDetail={onOpenDetail}
    >
      <Box>
        <Typography variant="subtitle2" gutterBottom color="secondary">
          Policy Configuration
        </Typography>

        <Grid container spacing={2}>
          {/* DLP Settings */}
          {renderSetting('Enabled', settings.enabled)}
          {renderSetting('Mode', settings.mode)}
          {renderSetting('Priority', settings.priority)}

          {/* Sensitivity Label Settings */}
          {renderSetting('Sensitivity Level', settings.sensitivity)}
          {renderSetting('Active', settings.isActive)}
          {renderSetting('Parent Label ID', settings.parentId)}
        </Grid>

        {Object.keys(settings).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No detailed settings available for this policy type.
          </Typography>
        )}

        {/* Policy Type Indicator */}
        <Box mt={2}>
          <Chip
            label={policy.parsedData.odataType || 'DLP/Sensitivity Policy'}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>
    </BasePolicyCard>
  );
};

export default PurviewPolicyCard;
```

---

## Step 4: Create Azure AD Policy Card

📁 **File:** `client/src/components/policy-viewer/AzureADPolicyCard.tsx`

```typescript
import React from 'react';
import { Box, Typography, Grid, Chip, Alert } from '@mui/material';
import BasePolicyCard from './BasePolicyCard';
import { PolicyDetail } from '../../types/policyViewer.types';

interface AzureADPolicyCardProps {
  policy: PolicyDetail;
  onOpenDetail: (policy: PolicyDetail) => void;
}

const AzureADPolicyCard: React.FC<AzureADPolicyCardProps> = ({ policy, onOpenDetail }) => {
  const settings = policy.parsedData.settings;

  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'enabled':
        return 'success';
      case 'disabled':
        return 'error';
      case 'enabledforreportingbutnotenforced':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <BasePolicyCard
      policy={policy}
      accentColor="#66BB6A"
      onOpenDetail={onOpenDetail}
    >
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ color: '#66BB6A' }}>
          Conditional Access Configuration
        </Typography>

        {/* Policy State */}
        {settings.state && (
          <Box mb={2}>
            <Chip
              label={`State: ${settings.state}`}
              color={getStateColor(settings.state)}
              size="small"
            />
          </Box>
        )}

        {/* Conditions */}
        {settings.conditions && (
          <Box mb={2}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Conditions:
            </Typography>
            <Grid container spacing={1}>
              {settings.conditions.users && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    User Conditions: Configured
                  </Typography>
                </Grid>
              )}
              {settings.conditions.applications && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Application Conditions: Configured
                  </Typography>
                </Grid>
              )}
              {settings.conditions.locations && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Location Conditions: Configured
                  </Typography>
                </Grid>
              )}
              {settings.conditions.signInRiskLevels && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Risk Levels: {settings.conditions.signInRiskLevels.join(', ')}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Grant Controls */}
        {settings.grantControls && (
          <Box mb={2}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Grant Controls:
            </Typography>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Grant controls configured (expand for details)
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Session Controls */}
        {settings.sessionControls && (
          <Box>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Session Controls:
            </Typography>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Session controls configured (expand for details)
              </Typography>
            </Alert>
          </Box>
        )}

        {Object.keys(settings).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No detailed settings available for this policy type.
          </Typography>
        )}
      </Box>
    </BasePolicyCard>
  );
};

export default AzureADPolicyCard;
```

---

## Step 5: Create Policy Detail Modal

📁 **File:** `client/src/components/policy-viewer/PolicyDetailModal.tsx`

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail } from '../../types/policyViewer.types';

interface PolicyDetailModalProps {
  policy: PolicyDetail | null;
  open: boolean;
  onClose: () => void;
}

const PolicyDetailModal: React.FC<PolicyDetailModalProps> = ({
  policy,
  open,
  onClose,
}) => {
  if (!policy) return null;

  const renderJsonSection = (title: string, data: any) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }

    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.default',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" component="span">
              {policy.policyName}
            </Typography>
            <Box mt={1}>
              <Chip
                label={policy.policyType}
                size="small"
                color={
                  policy.policyType === 'Intune'
                    ? 'info'
                    : policy.policyType === 'Purview'
                    ? 'secondary'
                    : 'success'
                }
                sx={{ mr: 1 }}
              />
              <Chip
                label={policy.isActive ? 'Active' : 'Inactive'}
                size="small"
                color={policy.isActive ? 'success' : 'default'}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Description */}
        {policy.policyDescription && (
          <Box mb={3}>
            <Typography variant="body1">{policy.policyDescription}</Typography>
          </Box>
        )}

        {/* Metadata */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Policy ID: {policy.policyId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last Synced: {formatDistanceToNow(new Date(policy.lastSynced), { addSuffix: true })}
          </Typography>
          {policy.parsedData.createdDateTime && (
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(policy.parsedData.createdDateTime).toLocaleString()}
            </Typography>
          )}
          {policy.parsedData.modifiedDateTime && (
            <Typography variant="body2" color="text.secondary">
              Modified: {new Date(policy.parsedData.modifiedDateTime).toLocaleString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Mapped Controls */}
        {policy.mappedControls.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Mapped NIST Controls ({policy.mappedControls.length})
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {policy.mappedControls.map((control) => (
                <Paper key={control.controlId} sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="subtitle2">{control.controlId}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {control.controlTitle}
                      </Typography>
                      {control.mappingNotes && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Note: {control.mappingNotes}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={`${control.mappingConfidence} Confidence`}
                      size="small"
                      color={
                        control.mappingConfidence === 'High'
                          ? 'success'
                          : control.mappingConfidence === 'Medium'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Settings */}
        {renderJsonSection('Policy Settings', policy.parsedData.settings)}

        {/* Full Policy Data */}
        {renderJsonSection('Complete Policy Data', policy.parsedData)}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailModal;
```

---

## Step 6: Update PolicyViewer Page to Use Cards

📁 **File:** `client/src/pages/PolicyViewer.tsx`

🔍 **FIND:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

➕ **ADD AFTER:**
```typescript
import IntunePolicyCard from '../components/policy-viewer/IntunePolicyCard';
import PurviewPolicyCard from '../components/policy-viewer/PurviewPolicyCard';
import AzureADPolicyCard from '../components/policy-viewer/AzureADPolicyCard';
import PolicyDetailModal from '../components/policy-viewer/PolicyDetailModal';
```

🔍 **FIND:**
```typescript
const [sortBy, setSortBy] = useState<'name' | 'lastSynced' | 'type'>('lastSynced');
```

➕ **ADD AFTER:**
```typescript
const [selectedPolicy, setSelectedPolicy] = useState<PolicyDetail | null>(null);
const [detailModalOpen, setDetailModalOpen] = useState(false);

const handleOpenDetail = (policy: PolicyDetail) => {
  setSelectedPolicy(policy);
  setDetailModalOpen(true);
};

const handleCloseDetail = () => {
  setDetailModalOpen(false);
  setSelectedPolicy(null);
};
```

🔍 **FIND:**
```typescript
          ) : (
            <Typography>
              Found {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              {/* Policy cards will be rendered here in Phase 3 */}
            </Typography>
          )}
```

✏️ **REPLACE WITH:**
```typescript
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              </Typography>
              
              {policies.map((policy) => {
                switch (policy.policyType) {
                  case 'Intune':
                    return (
                      <IntunePolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  case 'Purview':
                    return (
                      <PurviewPolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  case 'AzureAD':
                    return (
                      <AzureADPolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </Box>
          )}
```

🔍 **FIND:** the closing `</Container>` tag

➕ **ADD BEFORE:**
```typescript
      {/* Detail Modal */}
      <PolicyDetailModal
        policy={selectedPolicy}
        open={detailModalOpen}
        onClose={handleCloseDetail}
      />
```

➕ **ADD** import at top:
```typescript
import { PolicyDetail } from '../types/policyViewer.types';
```

---

## Verification Checklist

- [ ] All policy card components created
- [ ] BasePolicyCard component works
- [ ] IntunePolicyCard displays Intune policies correctly
- [ ] PurviewPolicyCard displays Purview policies correctly
- [ ] AzureADPolicyCard displays Azure AD policies correctly
- [ ] PolicyDetailModal opens and displays full details
- [ ] Expand/collapse functionality works on cards
- [ ] Mapped controls display with correct colors
- [ ] Policy status indicators work (active/inactive)
- [ ] Date formatting displays correctly
- [ ] Modal shows JSON data in readable format
- [ ] All policies render without errors

---

## Common Issues & Solutions

**Issue:** Cards not rendering
- **Solution:** Check that policies array has data, verify policyType field matches cases

**Issue:** Dates showing "Invalid Date"
- **Solution:** Ensure date strings are ISO format, check date-fns is installed

**Issue:** Settings object empty
- **Solution:** Verify backend policyData parsing is working, check JSON structure

**Issue:** Modal not opening
- **Solution:** Check state management, verify modal open/close handlers

**Issue:** Colors not matching theme
- **Solution:** Use hex colors from project spec: #42A5F5 (Intune), #AB47BC (Purview), #66BB6A (Azure AD)

---

## Enhancement Ideas

- Add "Copy to Clipboard" button for policy JSON
- Add direct link to edit policy in Microsoft admin centers
- Add policy comparison view
- Add policy change history
- Add filtering by mapped control
- Add bulk policy actions

---

## Next Steps

Proceed to **Phase 4** (`04_INTEGRATION.md`) to finalize integration, add polish, and complete testing.
