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
