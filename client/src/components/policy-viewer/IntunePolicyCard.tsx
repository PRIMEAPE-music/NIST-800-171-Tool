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
