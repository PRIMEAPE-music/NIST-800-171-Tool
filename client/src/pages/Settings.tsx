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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import M365SettingsTab from '../components/settings/M365SettingsTab';
import OrganizationSettingsTab from '../components/settings/OrganizationSettingsTab';
import { UserPreferences } from '../components/settings/UserPreferences';
import { DataManagement } from '../components/settings/DataManagement';

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
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAllSettings(),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Helper to convert preferences object to flat key-value pairs
  const getPreferencesAsKeyValue = (): Record<string, string> => {
    if (!settings?.preferences) return {};

    const prefs = settings.preferences as any;
    return {
      pref_date_format: prefs.dateFormat || 'MM/DD/YYYY',
      pref_items_per_page: prefs.itemsPerPage?.toString() || '50',
      pref_default_view: prefs.defaultView || 'table',
      pref_notifications_enabled: prefs.notificationsEnabled?.toString() || 'true',
      pref_show_completed_controls: prefs.showCompletedControls?.toString() || 'true',
      pref_show_not_started_controls: prefs.showNotStartedControls?.toString() || 'true',
      pref_default_control_family: prefs.defaultControlFamily || 'all',
      pref_default_status_filter: prefs.defaultStatusFilter || 'all',
      pref_default_priority_filter: prefs.defaultPriorityFilter || 'all',
      pref_assessment_reminder_days: prefs.assessmentReminderDays?.toString() || '7',
      pref_poam_reminder_days: prefs.poamReminderDays?.toString() || '7',
      pref_show_family_descriptions: prefs.showFamilyDescriptions?.toString() || 'true',
      pref_expand_control_details_default: prefs.expandControlDetailsDefault?.toString() || 'false',
      pref_custom_tags: prefs.customTags || '[]',
      pref_time_format: prefs.timeFormat || '12h',
      pref_dashboard_refresh_seconds: prefs.dashboardRefreshSeconds?.toString() || '60',
    };
  };

  // Save user preferences
  const handleSaveUserPreferences = async (preferences: Record<string, string>) => {
    await settingsService.updateSettingsCategory('preferences', preferences);
    await refetch();
  };

  // Reset user preferences to defaults
  const handleResetUserPreferences = async () => {
    await settingsService.resetCategory('preferences');
    await refetch();
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
          {settings && (
            <UserPreferences
              initialPreferences={getPreferencesAsKeyValue()}
              onSave={handleSaveUserPreferences}
              onReset={handleResetUserPreferences}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <DataManagement />
        </TabPanel>
      </Paper>
    </Container>
  );
};
