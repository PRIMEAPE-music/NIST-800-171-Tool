import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface ComplianceStatusBadgeProps {
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED' | 'UNKNOWN' | 'NOT_CHECKED';
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const ComplianceStatusBadge: React.FC<ComplianceStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'small',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLIANT':
        return {
          label: 'Compliant',
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" />,
          tooltip: 'This setting is configured correctly and meets the expected value.',
        };
      case 'NON_COMPLIANT':
        return {
          label: 'Non-Compliant',
          color: 'error' as const,
          icon: <CancelIcon fontSize="small" />,
          tooltip: 'This setting does not match the expected value. Action required.',
        };
      case 'NOT_CONFIGURED':
        return {
          label: 'Not Configured',
          color: 'warning' as const,
          icon: <HelpOutlineIcon fontSize="small" />,
          tooltip: 'This setting has not been configured in your M365 environment.',
        };
      case 'UNKNOWN':
      case 'NOT_CHECKED':
      default:
        return {
          label: 'Not Checked',
          color: 'default' as const,
          icon: <HelpOutlineIcon fontSize="small" />,
          tooltip: 'Compliance status has not been checked yet.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        icon={config.icon}
        label={showLabel ? config.label : undefined}
        color={config.color}
        size={size}
        variant="filled"
        sx={{
          fontWeight: 500,
          '& .MuiChip-icon': {
            marginLeft: 1,
          },
        }}
      />
    </Tooltip>
  );
};

export default ComplianceStatusBadge;
