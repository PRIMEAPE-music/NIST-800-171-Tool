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
