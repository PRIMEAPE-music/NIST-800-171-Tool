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
