import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

interface POAMTabsProps {
  activeTab: 'active' | 'completed';
  onTabChange: (tab: 'active' | 'completed') => void;
  activeCount: number;
  completedCount: number;
}

export const POAMTabs: React.FC<POAMTabsProps> = ({
  activeTab,
  onTabChange,
  activeCount,
  completedCount,
}) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => onTabChange(newValue)}
        aria-label="POAM tabs"
      >
        <Tab
          label={`Active POAMs (${activeCount})`}
          value="active"
          sx={{ textTransform: 'none', fontSize: '1rem' }}
        />
        <Tab
          label={`Completed POAMs (${completedCount})`}
          value="completed"
          sx={{ textTransform: 'none', fontSize: '1rem' }}
        />
      </Tabs>
    </Box>
  );
};
