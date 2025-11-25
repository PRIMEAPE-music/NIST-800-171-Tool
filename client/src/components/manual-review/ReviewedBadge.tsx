// client/src/components/manual-review/ReviewedBadge.tsx

import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import {
  CheckCircle as CompliantIcon,
  Cancel as NonCompliantIcon,
  HelpOutline as PartialIcon,
  Verified as ReviewedIcon,
} from '@mui/icons-material';
import { ManualComplianceStatus } from '../../types/manualReview.types';

interface ReviewedBadgeProps {
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rationale?: string;
  size?: 'small' | 'medium';
}

const getStatusColor = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'NON_COMPLIANT':
      return 'error';
    default:
      return 'info';
  }
};

const getStatusIcon = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return <CompliantIcon fontSize="small" />;
    case 'PARTIAL':
      return <PartialIcon fontSize="small" />;
    case 'NON_COMPLIANT':
      return <NonCompliantIcon fontSize="small" />;
    default:
      return <ReviewedIcon fontSize="small" />;
  }
};

const getStatusLabel = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return 'Compliant (Manual)';
    case 'PARTIAL':
      return 'Partial (Manual)';
    case 'NON_COMPLIANT':
      return 'Non-Compliant (Manual)';
    default:
      return 'Reviewed';
  }
};

export const ReviewedBadge: React.FC<ReviewedBadgeProps> = ({
  isReviewed,
  manualComplianceStatus,
  reviewedAt,
  reviewedBy,
  rationale,
  size = 'small',
}) => {
  if (!isReviewed) return null;

  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="body2" fontWeight="bold" gutterBottom>
        Manually Reviewed
      </Typography>
      {reviewedAt && (
        <Typography variant="caption" display="block">
          Reviewed: {new Date(reviewedAt).toLocaleDateString()}
        </Typography>
      )}
      {reviewedBy && (
        <Typography variant="caption" display="block">
          By: {reviewedBy}
        </Typography>
      )}
      {rationale && (
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          <strong>Rationale:</strong> {rationale}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        icon={getStatusIcon(manualComplianceStatus)}
        label={getStatusLabel(manualComplianceStatus)}
        size={size}
        color={getStatusColor(manualComplianceStatus) as any}
        variant="outlined"
        sx={{
          borderWidth: 2,
          '& .MuiChip-icon': {
            color: 'inherit',
          },
        }}
      />
    </Tooltip>
  );
};

export default ReviewedBadge;
