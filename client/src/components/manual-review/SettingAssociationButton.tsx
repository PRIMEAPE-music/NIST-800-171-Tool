// client/src/components/manual-review/SettingAssociationButton.tsx

import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import PolicySelectorDrawer from './PolicySelectorDrawer';
import PolicyComparisonModal from './PolicyComparisonModal';
import { PolicyForSelector } from '../../types/manualReview.types';
import { manualReviewService } from '../../services/manualReview.service';

interface SettingAssociationButtonProps {
  setting: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
    policyType: string;
  };
  controlId?: number;
  onSuccess?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  // If policyId is provided, skip the drawer and go directly to comparison
  policyId?: number;
}

export const SettingAssociationButton: React.FC<SettingAssociationButtonProps> = ({
  setting,
  controlId,
  onSuccess,
  variant = 'outlined',
  size = 'small',
  policyId,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyForSelector | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Fetch policy data if policyId is provided
  const { data: preselectedPolicy } = useQuery({
    queryKey: ['policy-for-association', policyId],
    queryFn: async () => {
      if (!policyId) return null;
      const policies = await manualReviewService.getPoliciesForSelector({
        isActive: true,
      });
      return policies.find(p => p.id === policyId) || null;
    },
    enabled: !!policyId,
  });

  const handleSelectPolicy = (policy: PolicyForSelector) => {
    setSelectedPolicy(policy);
    setDrawerOpen(false);
    setComparisonOpen(true);
  };

  const handleCloseComparison = () => {
    setComparisonOpen(false);
    setSelectedPolicy(null);
  };

  const handleSuccess = () => {
    handleCloseComparison();
    onSuccess?.();
  };

  const handleButtonClick = () => {
    if (policyId && preselectedPolicy) {
      // Skip drawer, go directly to comparison
      setSelectedPolicy(preselectedPolicy);
      setComparisonOpen(true);
    } else {
      // Open drawer to select policy
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <Tooltip title={policyId ? "Edit Setting Association" : "Associate with Policy"}>
        <Button
          variant={variant}
          size={size}
          startIcon={<LinkIcon />}
          onClick={handleButtonClick}
        >
          Associate
        </Button>
      </Tooltip>

      {!policyId && (
        <PolicySelectorDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelectPolicy={handleSelectPolicy}
          settingInfo={{
            displayName: setting.displayName,
            policyType: setting.policyType,
          }}
        />
      )}

      {selectedPolicy && (
        <PolicyComparisonModal
          open={comparisonOpen}
          onClose={handleCloseComparison}
          policy={selectedPolicy}
          settingToAssociate={setting}
          controlId={controlId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default SettingAssociationButton;
