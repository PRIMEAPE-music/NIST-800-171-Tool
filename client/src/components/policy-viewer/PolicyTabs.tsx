import React from 'react';
import { Tabs, Tab, Badge, Box } from '@mui/material';
import {
  ViewList as AllIcon,
  PhoneAndroid as IntuneIcon,
  Security as PurviewIcon,
  Cloud as AzureADIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { PolicyTypeTab } from '../../types/policyViewer.types';

interface PolicyTabsProps {
  currentTab: PolicyTypeTab;
  onTabChange: (tab: PolicyTypeTab) => void;
  counts: {
    all: number;
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
}

const PolicyTabs: React.FC<PolicyTabsProps> = ({
  currentTab,
  onTabChange,
  counts,
}) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: PolicyTypeTab) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          icon={<AllIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.all} color="primary" max={999}>
              <span style={{ marginRight: 16 }}>All Policies</span>
            </Badge>
          }
          value="all"
        />
        <Tab
          icon={<IntuneIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.Intune} color="info" max={999}>
              <span style={{ marginRight: 16 }}>Intune</span>
            </Badge>
          }
          value="Intune"
        />
        <Tab
          icon={<PurviewIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.Purview} color="secondary" max={999}>
              <span style={{ marginRight: 16 }}>Purview</span>
            </Badge>
          }
          value="Purview"
        />
        <Tab
          icon={<AzureADIcon />}
          iconPosition="start"
          label={
            <Badge badgeContent={counts.AzureAD} color="success" max={999}>
              <span style={{ marginRight: 16 }}>Azure AD</span>
            </Badge>
          }
          value="AzureAD"
        />
        <Tab
          icon={<SettingsIcon />}
          iconPosition="start"
          label="All Settings"
          value="allSettings"
        />
      </Tabs>
    </Box>
  );
};

export default PolicyTabs;
