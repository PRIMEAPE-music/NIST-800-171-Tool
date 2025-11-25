// client/src/components/manual-review/PolicyCompareButton.tsx

import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Compare as CompareIcon } from '@mui/icons-material';
import PolicyComparisonModal from './PolicyComparisonModal';
import { PolicyForSelector } from '../../types/manualReview.types';

interface PolicyCompareButtonProps {
  policy: PolicyForSelector;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const PolicyCompareButton: React.FC<PolicyCompareButtonProps> = ({
  policy,
  variant = 'outlined',
  size = 'small',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Compare settings against catalog">
        <Button
          variant={variant}
          size={size}
          startIcon={<CompareIcon />}
          onClick={() => setOpen(true)}
        >
          Compare
        </Button>
      </Tooltip>

      <PolicyComparisonModal
        open={open}
        onClose={() => setOpen(false)}
        policy={policy}
        // No settingToAssociate - just viewing comparison
      />
    </>
  );
};

export default PolicyCompareButton;
