// client/src/components/manual-review/PolicySelectorDrawer.tsx

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Policy as PolicyIcon,
  Cloud as IntuneIcon,
  Security as AzureADIcon,
  Shield as PurviewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { manualReviewService } from '../../services/manualReview.service';
import { PolicyForSelector } from '../../types/manualReview.types';

interface PolicySelectorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectPolicy: (policy: PolicyForSelector) => void;
  settingInfo?: {
    displayName: string;
    policyType: string;
  };
}

const getPolicyIcon = (type: string) => {
  switch (type) {
    case 'Intune':
      return <IntuneIcon />;
    case 'AzureAD':
      return <AzureADIcon />;
    case 'Purview':
      return <PurviewIcon />;
    default:
      return <PolicyIcon />;
  }
};

const getPolicyTypeColor = (type: string) => {
  switch (type) {
    case 'Intune':
      return 'info';
    case 'AzureAD':
      return 'success';
    case 'Purview':
      return 'secondary';
    default:
      return 'default';
  }
};

export const PolicySelectorDrawer: React.FC<PolicySelectorDrawerProps> = ({
  open,
  onClose,
  onSelectPolicy,
  settingInfo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Auto-detect policy type from setting
  const [policyTypeFilter, setPolicyTypeFilter] = useState<string>(settingInfo?.policyType || 'all');

  // Update policy type filter when settingInfo changes (drawer opens)
  React.useEffect(() => {
    if (settingInfo?.policyType) {
      setPolicyTypeFilter(settingInfo.policyType);
    }
  }, [settingInfo?.policyType]);

  // Fetch policies
  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['policies-selector', searchTerm, policyTypeFilter],
    queryFn: () =>
      manualReviewService.getPoliciesForSelector({
        searchTerm: searchTerm || undefined,
        policyType: policyTypeFilter !== 'all' ? policyTypeFilter : undefined,
        isActive: true,
      }),
    enabled: open,
  });

  // Filter policies based on search
  const filteredPolicies = useMemo(() => {
    if (!policies) return [];
    return policies;
  }, [policies]);

  const handleSelectPolicy = (policy: PolicyForSelector) => {
    onSelectPolicy(policy);
    // Don't close - let parent handle transition to comparison view
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: 1400, // Higher than modal (1300)
      }}
      PaperProps={{
        sx: {
          width: 400,
          bgcolor: '#1E1E1E',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Select Policy</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Setting Info */}
        {settingInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Associating Setting:
            </Typography>
            <Typography variant="body2">{settingInfo.displayName}</Typography>
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search policies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Policy Type Filter - Auto-detected */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Policy Type (Auto-detected)</InputLabel>
          <Select
            value={policyTypeFilter}
            label="Policy Type (Auto-detected)"
            disabled={!!settingInfo?.policyType}
            onChange={(e) => setPolicyTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Intune">Intune</MenuItem>
            <MenuItem value="AzureAD">Azure AD</MenuItem>
            <MenuItem value="Purview">Purview</MenuItem>
          </Select>
        </FormControl>

        {/* Policy List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load policies</Alert>
        ) : filteredPolicies.length === 0 ? (
          <Alert severity="info">No policies found</Alert>
        ) : (
          <List sx={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
            {filteredPolicies.map((policy) => (
              <ListItemButton
                key={policy.id}
                onClick={() => handleSelectPolicy(policy)}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <ListItemIcon>{getPolicyIcon(policy.policyType)}</ListItemIcon>
                <ListItemText
                  primary={policy.policyName}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={policy.policyType}
                        size="small"
                        color={getPolicyTypeColor(policy.policyType) as any}
                      />
                      {policy.templateFamily && (
                        <Chip label={policy.templateFamily} size="small" variant="outlined" />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {/* Results count */}
        {!isLoading && !error && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'} found
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default PolicySelectorDrawer;
