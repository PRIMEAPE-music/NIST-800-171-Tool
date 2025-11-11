import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import M365SettingsTab from '../components/settings/M365SettingsTab';
import OrganizationSettingsTab from '../components/settings/OrganizationSettingsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAllSettings(),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load settings. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0', mb: 3 }}>
        Settings
      </Typography>

      <Paper sx={{ backgroundColor: '#242424', borderRadius: 1 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              color: '#B0B0B0',
            },
            '& .Mui-selected': {
              color: '#90CAF9 !important',
            },
          }}
        >
          <Tab label="Microsoft 365" />
          <Tab label="Organization" />
          <Tab label="Preferences" />
          <Tab label="Data Management" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {settings && (
            <M365SettingsTab settings={settings.m365} onUpdate={refetch} />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {settings && (
            <OrganizationSettingsTab
              settings={settings.organization}
              onUpdate={refetch}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              User preferences will be implemented in Phase 8.2
            </Alert>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              Data management features will be implemented in Phase 8.3
            </Alert>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};
