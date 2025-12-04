// client/src/components/manual-review/PolicyComparisonModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CompliantIcon,
  Cancel as NonCompliantIcon,
  HelpOutline as PartialIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { manualReviewService } from '../../services/manualReview.service';
import {
  PolicyForSelector,
  ManualComplianceStatus,
  CatalogSettingComparison,
} from '../../types/manualReview.types';

interface PolicyComparisonModalProps {
  open: boolean;
  onClose: () => void;
  policy: PolicyForSelector;
  settingToAssociate?: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
  };
  controlId?: number;
  onSuccess?: () => void;
}

const getStatusIcon = (status: ManualComplianceStatus | null) => {
  switch (status) {
    case 'COMPLIANT':
      return <CompliantIcon color="success" />;
    case 'NON_COMPLIANT':
      return <NonCompliantIcon color="error" />;
    case 'PARTIAL':
      return <PartialIcon color="warning" />;
    default:
      return null;
  }
};

export const PolicyComparisonModal: React.FC<PolicyComparisonModalProps> = ({
  open,
  onClose,
  policy,
  settingToAssociate,
  controlId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [manualExpectedValue, setManualExpectedValue] = useState('');
  const [manualComplianceStatus, setManualComplianceStatus] = useState<ManualComplianceStatus | ''>('');
  const [rationale, setRationale] = useState('');

  // Filter state for comparison view
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Initialize form with setting data
  useEffect(() => {
    if (settingToAssociate) {
      setManualExpectedValue(settingToAssociate.expectedValue);
    }
  }, [settingToAssociate]);

  // Fetch policy comparison data
  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['policy-comparison', policy.id],
    queryFn: () => manualReviewService.getPolicySettingsComparison(policy.id),
    enabled: open,
  });

  // Fetch raw policy settings
  const { data: rawSettings } = useQuery({
    queryKey: ['policy-raw-settings', policy.id],
    queryFn: () => manualReviewService.getPolicyRawSettings(policy.id),
    enabled: open,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!settingToAssociate) throw new Error('No setting to associate');
      if (!rationale.trim()) throw new Error('Rationale is required');

      return manualReviewService.upsertReview({
        settingId: settingToAssociate.id,
        policyId: policy.id,
        controlId: controlId,
        isReviewed: true,
        manualComplianceStatus: manualComplianceStatus || undefined,
        manualExpectedValue: manualExpectedValue !== settingToAssociate.expectedValue ? manualExpectedValue : undefined,
        rationale: rationale.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['manual-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['m365-settings'] });
      onSuccess?.();
      onClose();
    },
  });

  // Filter catalog settings - show settings that are configured in the policy OR manually reviewed
  const filteredCatalogSettings = React.useMemo(() => {
    if (!comparison) return [];
    return comparison.catalogSettings.filter((setting) => {
      // INCLUDE settings that are either:
      // 1. Configured in the policy's raw data (status === 'CONFIGURED')
      // 2. OR manually reviewed/associated with this policy
      if (setting.status !== 'CONFIGURED' && !setting.manualReview?.isReviewed) {
        return false;
      }
      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        if (
          !setting.displayName.toLowerCase().includes(search) &&
          !setting.settingPath.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all' && setting.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [comparison, searchFilter, statusFilter]);

  // Find actual value for the setting we're associating
  const actualValueForSetting = React.useMemo(() => {
    if (!rawSettings || !settingToAssociate) return null;
    const pathParts = settingToAssociate.settingPath.split('.');
    let value: any = rawSettings;
    for (const part of pathParts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    return value;
  }, [rawSettings, settingToAssociate]);

  const handleSave = () => {
    saveMutation.mutate();
  };

  const canSave = rationale.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { bgcolor: '#1E1E1E', minHeight: '80vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">{policy.policyName}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={policy.policyType} size="small" color="primary" />
              {policy.templateFamily && (
                <Chip label={policy.templateFamily} size="small" variant="outlined" />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {comparisonLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
            {/* Left Panel - Policy Settings Overview */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Policy Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Settings configured in this policy or manually associated
              </Typography>

              {/* Summary */}
              {comparison && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Policy Settings
                    </Typography>
                    <Typography variant="h6">
                      {comparison.catalogSettings.filter(s => s.status === 'CONFIGURED' || s.manualReview?.isReviewed).length}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Configured
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {comparison.summary.configuredCount}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Manually Reviewed
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {comparison.summary.reviewedCount}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Available in Catalog
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      {comparison.summary.totalCatalogSettings}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Filters */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search settings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="CONFIGURED">Configured</MenuItem>
                    <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Settings List */}
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredCatalogSettings.length === 0 ? (
                  <Alert severity="info">
                    <Typography variant="body2">
                      No settings found in this policy. This policy either has no configured settings or they haven't been mapped to the catalog yet.
                    </Typography>
                  </Alert>
                ) : (
                  filteredCatalogSettings.map((setting) => (
                    <Accordion key={setting.id} sx={{ bgcolor: '#2C2C2C', mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Chip
                            label={setting.status === 'CONFIGURED' ? '✓' : '✗'}
                            size="small"
                            color={setting.status === 'CONFIGURED' ? 'success' : 'error'}
                            sx={{ minWidth: 32 }}
                          />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {setting.displayName}
                          </Typography>
                          {setting.manualReview?.manualComplianceStatus && (
                            <Tooltip title={`Manual Status: ${setting.manualReview.manualComplianceStatus}`}>
                              <Chip
                                label={setting.manualReview.manualComplianceStatus}
                                size="small"
                                color={
                                  setting.manualReview.manualComplianceStatus === 'COMPLIANT' ? 'success' :
                                  setting.manualReview.manualComplianceStatus === 'PARTIAL' ? 'warning' : 'error'
                                }
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Path: {setting.settingPath}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Expected: {setting.expectedValue}
                        </Typography>
                        {setting.actualValue && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Actual: {setting.actualValue}
                          </Typography>
                        )}
                        {setting.manualReview?.rationale && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold">
                              Rationale:
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {setting.manualReview.rationale}
                            </Typography>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Box>
            </Box>

            {/* Right Panel - Association Form (if setting provided) */}
            {settingToAssociate && (
              <Box sx={{ width: 400, flexShrink: 0 }}>
                <Paper sx={{ p: 2, bgcolor: '#2C2C2C' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Associate Setting with Policy
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {settingToAssociate.displayName}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Path: {settingToAssociate.settingPath}
                    </Typography>
                  </Alert>

                  {/* Actual Value from Policy */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Actual Value (from policy):
                    </Typography>
                    <Paper sx={{ p: 1, bgcolor: '#1a1a1a' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {actualValueForSetting !== null
                          ? JSON.stringify(actualValueForSetting, null, 2)
                          : 'Not found in policy'}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Expected Value (editable) */}
                  <TextField
                    fullWidth
                    label="Expected Value"
                    value={manualExpectedValue}
                    onChange={(e) => setManualExpectedValue(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    helperText="Optional - leave unchanged to use catalog default"
                  />

                  {/* Manual Compliance Status */}
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Compliance Status</InputLabel>
                    <Select
                      value={manualComplianceStatus}
                      label="Compliance Status"
                      onChange={(e) => setManualComplianceStatus(e.target.value as ManualComplianceStatus)}
                    >
                      <MenuItem value="">
                        <em>Auto-calculate</em>
                      </MenuItem>
                      <MenuItem value="COMPLIANT">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CompliantIcon color="success" fontSize="small" />
                          Compliant
                        </Box>
                      </MenuItem>
                      <MenuItem value="PARTIAL">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PartialIcon color="warning" fontSize="small" />
                          Partial
                        </Box>
                      </MenuItem>
                      <MenuItem value="NON_COMPLIANT">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NonCompliantIcon color="error" fontSize="small" />
                          Non-Compliant
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Rationale (required) */}
                  <TextField
                    fullWidth
                    label="Rationale *"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    multiline
                    rows={4}
                    size="small"
                    required
                    error={rationale.trim().length === 0}
                    helperText="Required - explain why this association/override is being made"
                    placeholder="e.g., Verified against CIS Benchmark v1.2 - this policy setting satisfies the encryption requirement..."
                  />
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        {settingToAssociate && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!canSave || saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Save & Mark as Reviewed
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PolicyComparisonModal;
