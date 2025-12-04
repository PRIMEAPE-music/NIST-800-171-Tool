import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Divider,
  Link,
  Tooltip,
  Button,
  TextField,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as ErrorIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Verified as VerifiedIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  PolicyControlMappingData,
  PolicyControlMappingControl,
  PolicyControlMappingSetting,
} from '../../types/policyControlMapping.types';
import { format } from 'date-fns';
import ManualComplianceDialog from './ManualComplianceDialog';

interface ControlMappingsTabProps {
  policyId: number;
}

const ControlMappingsTab: React.FC<ControlMappingsTabProps> = ({ policyId }) => {
  const [expandedControl, setExpandedControl] = useState<string | false>(false);
  const [expandedSettings, setExpandedSettings] = useState<Set<number>>(new Set());
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<any>(null);
  const [confirmingMapping, setConfirmingMapping] = useState<number | null>(null);
  const [mappingRationale, setMappingRationale] = useState('');

  const toggleSettingExpansion = (settingId: number) => {
    setExpandedSettings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(settingId)) {
        newSet.delete(settingId);
      } else {
        newSet.add(settingId);
      }
      return newSet;
    });
  };

  // Fetch control mappings
  const {
    data: mappingData,
    isLoading,
    error,
    refetch: loadControlMappings,
  } = useQuery<PolicyControlMappingData>({
    queryKey: ['policyControlMappings', policyId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/m365/policies/viewer/${policyId}/control-mappings`
      );
      return response.data.data;
    },
  });

  const handleAccordionChange = (controlId: string) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedControl(isExpanded ? controlId : false);
  };

  const handleConfirmMapping = async (settingId: number) => {
    if (!mappingRationale.trim()) {
      return; // No rationale provided
    }

    try {
      await axios.post('/api/manual-reviews/confirm-mapping', {
        settingId,
        policyId,
        rationale: mappingRationale.trim(),
      });

      // Reset state and refetch
      setConfirmingMapping(null);
      setMappingRationale('');
      loadControlMappings();
    } catch (error) {
      console.error('Error confirming mapping:', error);
      alert('Failed to confirm mapping. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load control mappings. Please try again.
      </Alert>
    );
  }

  if (!mappingData || mappingData.controls.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No control mappings found for this policy. Settings may not be validated yet.
      </Alert>
    );
  }

  const getComplianceIcon = (isCompliant: boolean) => {
    return isCompliant ? (
      <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
    ) : (
      <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
    );
  };

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
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Settings
              </Typography>
              <Typography variant="h4">{mappingData.summary.totalSettings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Confirmed
              </Typography>
              <Typography variant="h4" color="primary.main">
                {mappingData.summary.confirmedSettings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Potential
              </Typography>
              <Typography variant="h4" sx={{ color: '#FFA726' }}>
                {mappingData.summary.potentialSettings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Compliant
              </Typography>
              <Typography variant="h4" color="success.main">
                {mappingData.summary.compliantSettings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Controls Affected
              </Typography>
              <Typography variant="h4" color="info.main">
                {mappingData.summary.controlsAffected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls List */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
        Settings Grouped by Control
      </Typography>

      {mappingData.controls.map((control: PolicyControlMappingControl) => {
        const compliantCount = control.settings.filter((s) => s.isCompliant).length;
        const totalCount = control.settings.length;
        const compliancePercentage = Math.round((compliantCount / totalCount) * 100);
        const isPartiallyCompliant = compliantCount > 0 && compliantCount < totalCount;

        return (
          <Accordion
            key={control.controlId}
            expanded={expandedControl === control.controlId}
            onChange={handleAccordionChange(control.controlId)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%" gap={2}>
                <Chip
                  label={control.controlId}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body1" fontWeight="medium" sx={{ flexGrow: 1 }}>
                  {control.family} - {control.controlTitle}
                </Typography>
                {/* Show reviewed badge if any settings are manually reviewed */}
                {control.settings.some((s: PolicyControlMappingSetting) => s.manualReview?.manualComplianceStatus) && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Reviewed"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {isPartiallyCompliant && (
                  <Chip
                    label="Partial Compliance"
                    size="small"
                    color="warning"
                  />
                )}
                <Chip
                  label={`${compliantCount}/${totalCount} compliant`}
                  size="small"
                  color={compliancePercentage === 100 ? 'success' : compliancePercentage > 0 ? 'warning' : 'error'}
                />
                <Typography variant="body2" color="text.secondary">
                  {compliancePercentage}%
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {control.settings.map((setting: PolicyControlMappingSetting) => {
                  const isExpanded = expandedSettings.has(setting.settingId);

                  return (
                    <Paper
                      key={setting.settingId}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderLeft: 4,
                        borderLeftColor: setting.isCompliant ? 'success.main' : 'error.main',
                        backgroundColor: setting.isCompliant
                          ? 'rgba(46, 125, 50, 0.04)'
                          : 'rgba(211, 47, 47, 0.04)',
                      }}
                    >
                      {/* Setting Header */}
                      <Box display="flex" alignItems="flex-start" gap={1} mb={2}>
                        {getComplianceIcon(setting.isCompliant)}
                        <Box flex={1}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {setting.settingName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Validation: {setting.validationOperator}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => toggleSettingExpansion(setting.settingId)}
                          sx={{ ml: 'auto' }}
                        >
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </Box>

                      {/* Metadata Chips */}
                      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                        {/* Mapping Status Badge */}
                        <Chip
                          label={setting.mappingStatus === 'POTENTIAL' ? 'POTENTIAL' : 'CONFIRMED'}
                          size="small"
                          color={setting.mappingStatus === 'POTENTIAL' ? 'warning' : 'primary'}
                          variant={setting.mappingStatus === 'POTENTIAL' ? 'outlined' : 'filled'}
                          sx={{
                            fontWeight: 'bold',
                            borderWidth: setting.mappingStatus === 'POTENTIAL' ? 2 : 1,
                          }}
                        />
                        <Chip
                          label={setting.confidence}
                          size="small"
                          color={getConfidenceColor(setting.confidence) as any}
                        />
                        {setting.platform && (
                          <Chip
                            label={setting.platform}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={format(new Date(setting.lastChecked), 'MM/dd/yy HH:mm')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>

                      {/* Expected Value */}
                      <Box mb={2}>
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
                            maxHeight: 150,
                            overflow: 'auto',
                          }}
                        >
                          {formatValue(setting.expectedValue)}
                        </Paper>
                      </Box>

                      {/* Actual Value */}
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                          Actual Value:
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
                            maxHeight: 150,
                            overflow: 'auto',
                          }}
                        >
                          {formatValue(setting.actualValue)}
                        </Paper>
                      </Box>

                      {/* Manual Review Section */}
                      {setting.manualReview && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
                            Manual Review:
                          </Typography>
                          <Paper sx={{ p: 1.5, bgcolor: '#1a1a1a' }}>
                            <Box display="flex" gap={1} mb={1} flexWrap="wrap" alignItems="center">
                              <Chip
                                label={
                                  setting.manualReview.manualComplianceStatus === 'COMPLIANT'
                                    ? 'Compliant'
                                    : setting.manualReview.manualComplianceStatus === 'PARTIAL'
                                    ? 'Partial'
                                    : 'Non-Compliant'
                                }
                                size="small"
                                color={
                                  setting.manualReview.manualComplianceStatus === 'COMPLIANT'
                                    ? 'success'
                                    : setting.manualReview.manualComplianceStatus === 'PARTIAL'
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                              {setting.manualReview.reviewedAt && (
                                <Chip
                                  label={`Reviewed ${new Date(setting.manualReview.reviewedAt).toLocaleDateString()}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {setting.manualReview.evidenceCount > 0 && (
                                <Chip
                                  label={`${setting.manualReview.evidenceCount} evidence file${
                                    setting.manualReview.evidenceCount > 1 ? 's' : ''
                                  }`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              <strong>Rationale:</strong> {setting.manualReview.rationale}
                            </Typography>
                          </Paper>
                        </Box>
                      )}

                      {/* Action Buttons */}
                      <Box mt={2} mb={isExpanded ? 2 : 0} display="flex" gap={1} alignItems="center">
                        {setting.mappingStatus === 'POTENTIAL' ? (
                          <>
                            {confirmingMapping === setting.settingId ? (
                              <>
                                <TextField
                                  size="small"
                                  placeholder="Enter rationale for confirming this mapping..."
                                  value={mappingRationale}
                                  onChange={(e) => setMappingRationale(e.target.value)}
                                  sx={{ flexGrow: 1, minWidth: 300 }}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  disabled={!mappingRationale.trim()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmMapping(setting.settingId);
                                  }}
                                >
                                  Submit
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmingMapping(null);
                                    setMappingRationale('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="contained"
                                size="small"
                                color="warning"
                                startIcon={<LinkIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingMapping(setting.settingId);
                                  setMappingRationale('');
                                }}
                              >
                                Confirm Mapping
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant={setting.manualReview ? 'outlined' : 'contained'}
                            size="small"
                            startIcon={setting.manualReview ? <EditIcon /> : <CheckCircleIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSetting({
                                id: setting.settingId,
                                displayName: setting.settingName,
                                manualReview: setting.manualReview,
                              });
                              setComplianceDialogOpen(true);
                            }}
                          >
                            {setting.manualReview ? 'Update Review' : 'Mark Compliance'}
                          </Button>
                        )}
                      </Box>

                      {/* Expandable Details Section */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Divider sx={{ my: 2 }} />

                        {/* Description */}
                        {setting.settingDescription && (
                          <Box mb={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                              Description:
                            </Typography>
                            <Typography variant="body2">
                              {setting.settingDescription}
                            </Typography>
                          </Box>
                        )}

                        {/* Setting Path */}
                        <Box mb={2}>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                            Setting Path:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {setting.settingPath}
                          </Typography>
                        </Box>

                        {/* Validation Operator (detailed) */}
                        <Box mb={2}>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                            Validation Operator:
                          </Typography>
                          <Chip label={setting.validationOperator} size="small" variant="outlined" />
                        </Box>

                        {/* Implementation Guide */}
                        {setting.implementationGuide && (
                          <Box mb={2}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                              Implementation Guide:
                            </Typography>
                            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                              {setting.implementationGuide
                                .split(/(?=\d+\.\s)/)
                                .filter(step => step.trim())
                                .map((step, index) => {
                                  const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
                                  if (!cleanStep) return null;

                                  const hasSubItems = cleanStep.includes('\n-') || cleanStep.includes('\n  -');
                                  if (hasSubItems) {
                                    const [mainStep, ...subItems] = cleanStep.split(/\n\s*-\s*/);
                                    return (
                                      <Box component="li" key={index} sx={{ mb: 1 }}>
                                        <Typography variant="body2">{mainStep}</Typography>
                                        <Box component="ul" sx={{ mt: 0.5, pl: 2 }}>
                                          {subItems.map((subItem, subIndex) => (
                                            <Box component="li" key={subIndex}>
                                              <Typography variant="body2">{subItem.trim()}</Typography>
                                            </Box>
                                          ))}
                                        </Box>
                                      </Box>
                                    );
                                  }
                                  return (
                                    <Box component="li" key={index} sx={{ mb: 1 }}>
                                      <Typography variant="body2">{cleanStep}</Typography>
                                    </Box>
                                  );
                                })}
                            </Box>
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
                              <OpenInNewIcon fontSize="small" />
                              View Microsoft Documentation
                            </Link>
                          </Box>
                        )}

                        {/* Mapped Controls */}
                        {setting.mappedControls && setting.mappedControls.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                              Mapped Controls:
                            </Typography>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {setting.mappedControls.map((mappedControl) => (
                                <Tooltip
                                  key={mappedControl.controlId}
                                  title={`${mappedControl.controlFamily} - ${mappedControl.controlTitle}`}
                                >
                                  <Chip
                                    label={mappedControl.controlId}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Collapse>
                    </Paper>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Manual Compliance Dialog */}
      {selectedSetting && (
        <ManualComplianceDialog
          open={complianceDialogOpen}
          onClose={() => {
            setComplianceDialogOpen(false);
            setSelectedSetting(null);
          }}
          settingId={selectedSetting.id}
          policyId={policyId}
          controlId={undefined}
          settingName={selectedSetting.displayName}
          currentStatus={selectedSetting.manualReview?.manualComplianceStatus || null}
          currentRationale={selectedSetting.manualReview?.rationale || ''}
          onSaved={() => {
            // Reload the control mappings to show updated status
            loadControlMappings();
          }}
        />
      )}
    </Box>
  );
};

export default ControlMappingsTab;
