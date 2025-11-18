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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  PolicyControlMappingData,
  PolicyControlMappingControl,
  PolicyControlMappingSetting,
} from '../../types/policyControlMapping.types';
import { format } from 'date-fns';

interface ControlMappingsTabProps {
  policyId: number;
}

const ControlMappingsTab: React.FC<ControlMappingsTabProps> = ({ policyId }) => {
  const [expandedControl, setExpandedControl] = useState<string | false>(false);

  // Fetch control mappings
  const {
    data: mappingData,
    isLoading,
    error,
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Settings
              </Typography>
              <Typography variant="h4">{mappingData.summary.totalSettings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Non-Compliant
              </Typography>
              <Typography variant="h4" color="error.main">
                {mappingData.summary.nonCompliantSettings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
                <Chip
                  label={`${compliantCount}/${totalCount} compliant`}
                  size="small"
                  color={compliancePercentage === 100 ? 'success' : 'error'}
                />
                <Typography variant="body2" color="text.secondary">
                  {compliancePercentage}%
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {control.settings.map((setting: PolicyControlMappingSetting) => (
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
                    </Box>

                    {/* Metadata Chips */}
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
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
                    <Box>
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
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default ControlMappingsTab;
