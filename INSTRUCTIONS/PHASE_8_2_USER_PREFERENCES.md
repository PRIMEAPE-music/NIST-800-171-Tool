# Phase 8.2: User Preferences & Customization

## Overview
Extend the Settings page with comprehensive user preferences, display customization options, notification settings, and default view configurations. This phase allows users to tailor the application to their workflow and preferences.

## Objectives
- Add User Preferences tab to Settings page
- Implement display preferences (date formats, pagination, themes)
- Create notification preferences section
- Add default filter and view settings
- Implement custom tags/labels management
- Add assessment schedule configuration
- Ensure all preferences persist and apply immediately

## Prerequisites
- Phase 8.1 (Settings Foundation) must be complete
- Settings database table must exist with default values
- Settings API endpoints must be functional

---

## Step 1: Extend Database Schema for User Preferences

### 1.1 Add New Preference Settings to Seed

📁 `server/prisma/seed.ts`

➕ ADD to the defaultSettings array in the seed function (after existing preferences):

```typescript
    // Additional User Preferences
    { key: 'pref_show_completed_controls', value: 'true', category: 'preferences' },
    { key: 'pref_show_not_started_controls', value: 'true', category: 'preferences' },
    { key: 'pref_default_control_family', value: 'all', category: 'preferences' },
    { key: 'pref_default_status_filter', value: 'all', category: 'preferences' },
    { key: 'pref_default_priority_filter', value: 'all', category: 'preferences' },
    { key: 'pref_assessment_reminder_days', value: '7', category: 'preferences' },
    { key: 'pref_poam_reminder_days', value: '7', category: 'preferences' },
    { key: 'pref_show_family_descriptions', value: 'true', category: 'preferences' },
    { key: 'pref_expand_control_details_default', value: 'false', category: 'preferences' },
    { key: 'pref_custom_tags', value: JSON.stringify([]), category: 'preferences' },
    { key: 'pref_time_format', value: '12h', category: 'preferences' }, // 12h or 24h
    { key: 'pref_dashboard_refresh_seconds', value: '60', category: 'preferences' },
```

Run the seed update:
```bash
cd server
npx prisma db seed
```

---

## Step 2: Create User Preferences Component

### 2.1 Create UserPreferences Component

📁 `client/src/components/settings/UserPreferences.tsx`

🔄 COMPLETE FILE:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Button,
  Typography,
  Alert,
  Divider,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';

interface UserPreferencesProps {
  onSave: (preferences: Record<string, string>) => Promise<void>;
  onReset: () => Promise<void>;
  initialPreferences: Record<string, string>;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({
  onSave,
  onReset,
  initialPreferences,
}) => {
  const [preferences, setPreferences] = useState<Record<string, string>>(initialPreferences);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Parse custom tags from preferences
  useEffect(() => {
    try {
      const tags = JSON.parse(preferences.pref_custom_tags || '[]');
      setCustomTags(Array.isArray(tags) ? tags : []);
    } catch {
      setCustomTags([]);
    }
  }, [preferences.pref_custom_tags]);

  // Update preferences and track changes
  const updatePreference = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      await onSave(preferences);
      setSaveStatus('success');
      setSaveMessage('Preferences saved successfully');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save preferences');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  // Handle reset to defaults
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all preferences to default values?')) {
      try {
        setSaveStatus('saving');
        await onReset();
        setSaveStatus('success');
        setSaveMessage('Preferences reset to defaults');
        setHasChanges(false);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        setSaveStatus('error');
        setSaveMessage('Failed to reset preferences');
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }
  };

  // Add custom tag
  const handleAddTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      const updatedTags = [...customTags, newTag.trim()];
      setCustomTags(updatedTags);
      updatePreference('pref_custom_tags', JSON.stringify(updatedTags));
      setNewTag('');
    }
  };

  // Remove custom tag
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = customTags.filter(tag => tag !== tagToRemove);
    setCustomTags(updatedTags);
    updatePreference('pref_custom_tags', JSON.stringify(updatedTags));
  };

  return (
    <Box>
      {/* Status Alert */}
      {saveStatus !== 'idle' && (
        <Alert 
          severity={saveStatus === 'error' ? 'error' : saveStatus === 'success' ? 'success' : 'info'}
          sx={{ mb: 3 }}
        >
          {saveMessage}
        </Alert>
      )}

      {/* Display Preferences Section */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Display Preferences
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Date Format */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                value={preferences.pref_date_format || 'MM/DD/YYYY'}
                label="Date Format"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_date_format', e.target.value)}
              >
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (US)</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (Europe)</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
                <MenuItem value="MMM DD, YYYY">MMM DD, YYYY (Text)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Time Format */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Time Format</InputLabel>
              <Select
                value={preferences.pref_time_format || '12h'}
                label="Time Format"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_time_format', e.target.value)}
              >
                <MenuItem value="12h">12-hour (3:30 PM)</MenuItem>
                <MenuItem value="24h">24-hour (15:30)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Items Per Page */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Items Per Page</InputLabel>
              <Select
                value={preferences.pref_items_per_page || '50'}
                label="Items Per Page"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_items_per_page', e.target.value)}
              >
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="25">25</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="100">100</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Default View */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Default Control View</InputLabel>
              <Select
                value={preferences.pref_default_view || 'table'}
                label="Default Control View"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_default_view', e.target.value)}
              >
                <MenuItem value="table">Table View</MenuItem>
                <MenuItem value="card">Card View</MenuItem>
                <MenuItem value="list">List View</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Dashboard Refresh Rate */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Dashboard Refresh (seconds)"
              value={preferences.pref_dashboard_refresh_seconds || '60'}
              onChange={(e) => updatePreference('pref_dashboard_refresh_seconds', e.target.value)}
              inputProps={{ min: 10, max: 300, step: 10 }}
              helperText="Auto-refresh interval for dashboard statistics"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Default Filters Section */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Default Filters
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Default Family */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Default Control Family</InputLabel>
              <Select
                value={preferences.pref_default_control_family || 'all'}
                label="Default Control Family"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_default_control_family', e.target.value)}
              >
                <MenuItem value="all">All Families</MenuItem>
                <MenuItem value="AC">Access Control (AC)</MenuItem>
                <MenuItem value="AT">Awareness and Training (AT)</MenuItem>
                <MenuItem value="AU">Audit and Accountability (AU)</MenuItem>
                <MenuItem value="CA">Assessment (CA)</MenuItem>
                <MenuItem value="CM">Configuration Management (CM)</MenuItem>
                <MenuItem value="CP">Contingency Planning (CP)</MenuItem>
                <MenuItem value="IA">Identification and Authentication (IA)</MenuItem>
                <MenuItem value="IR">Incident Response (IR)</MenuItem>
                <MenuItem value="MA">Maintenance (MA)</MenuItem>
                <MenuItem value="MP">Media Protection (MP)</MenuItem>
                <MenuItem value="PE">Physical Protection (PE)</MenuItem>
                <MenuItem value="PS">Personnel Security (PS)</MenuItem>
                <MenuItem value="RA">Risk Assessment (RA)</MenuItem>
                <MenuItem value="SA">System and Services Acquisition (SA)</MenuItem>
                <MenuItem value="SC">System and Communications Protection (SC)</MenuItem>
                <MenuItem value="SI">System and Information Integrity (SI)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Default Status */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Default Status Filter</InputLabel>
              <Select
                value={preferences.pref_default_status_filter || 'all'}
                label="Default Status Filter"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_default_status_filter', e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Not Started">Not Started</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Implemented">Implemented</MenuItem>
                <MenuItem value="Verified">Verified</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Default Priority */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Default Priority Filter</InputLabel>
              <Select
                value={preferences.pref_default_priority_filter || 'all'}
                label="Default Priority Filter"
                onChange={(e: SelectChangeEvent) => updatePreference('pref_default_priority_filter', e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Control Display Options */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Control Display Options
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pref_show_completed_controls === 'true'}
                  onChange={(e) => updatePreference('pref_show_completed_controls', e.target.checked.toString())}
                />
              }
              label="Show completed controls in library"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pref_show_not_started_controls === 'true'}
                  onChange={(e) => updatePreference('pref_show_not_started_controls', e.target.checked.toString())}
                />
              }
              label="Show not started controls in library"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pref_show_family_descriptions === 'true'}
                  onChange={(e) => updatePreference('pref_show_family_descriptions', e.target.checked.toString())}
                />
              }
              label="Show family descriptions in control library"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pref_expand_control_details_default === 'true'}
                  onChange={(e) => updatePreference('pref_expand_control_details_default', e.target.checked.toString())}
                />
              }
              label="Expand control details by default"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Notification Preferences */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Notifications & Reminders
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pref_notifications_enabled === 'true'}
                  onChange={(e) => updatePreference('pref_notifications_enabled', e.target.checked.toString())}
                />
              }
              label="Enable in-app notifications"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Assessment Reminder (days before due)"
              value={preferences.pref_assessment_reminder_days || '7'}
              onChange={(e) => updatePreference('pref_assessment_reminder_days', e.target.value)}
              inputProps={{ min: 1, max: 90 }}
              helperText="Days before assessment due date to show reminder"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="POAM Reminder (days before due)"
              value={preferences.pref_poam_reminder_days || '7'}
              onChange={(e) => updatePreference('pref_poam_reminder_days', e.target.value)}
              inputProps={{ min: 1, max: 90 }}
              helperText="Days before POAM due date to show reminder"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Custom Tags Section */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Custom Tags
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create custom tags to organize and categorize controls, assessments, and POAMs.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              label="New Tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Enter tag name"
            />
            <Button variant="outlined" onClick={handleAddTag}>
              Add Tag
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {customTags.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No custom tags created yet
              </Typography>
            ) : (
              customTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  color="primary"
                  variant="outlined"
                />
              ))
            )}
          </Box>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          disabled={saveStatus === 'saving'}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>
    </Box>
  );
};
```

---

## Step 3: Integrate User Preferences into Settings Page

### 3.1 Update Settings Page to Include UserPreferences Tab

📁 `client/src/pages/Settings.tsx`

🔍 FIND:
```typescript
const tabs = [
  { label: 'Microsoft 365', value: 'm365' },
  { label: 'Organization', value: 'organization' },
];
```

✏️ REPLACE WITH:
```typescript
const tabs = [
  { label: 'Microsoft 365', value: 'm365' },
  { label: 'Organization', value: 'organization' },
  { label: 'User Preferences', value: 'preferences' },
];
```

🔍 FIND (the tab panel rendering section):
```typescript
{/* Organization Settings Tab */}
{currentTab === 'organization' && (
  <OrganizationSettings
    onSave={handleSaveOrganizationSettings}
    initialSettings={organizationSettings}
  />
)}
```

✏️ ADD AFTER:
```typescript
{/* User Preferences Tab */}
{currentTab === 'preferences' && (
  <UserPreferences
    onSave={handleSaveUserPreferences}
    onReset={handleResetUserPreferences}
    initialPreferences={userPreferences}
  />
)}
```

🔍 FIND (near the top of the component):
```typescript
const [organizationSettings, setOrganizationSettings] = useState<Record<string, string>>({});
```

✏️ ADD AFTER:
```typescript
const [userPreferences, setUserPreferences] = useState<Record<string, string>>({});
```

🔍 FIND (in the useEffect that fetches settings):
```typescript
// Group settings by category
const m365 = settingsData.reduce((acc: Record<string, string>, setting: Setting) => {
  if (setting.category === 'm365') {
    acc[setting.key] = setting.value;
  }
  return acc;
}, {});

const org = settingsData.reduce((acc: Record<string, string>, setting: Setting) => {
  if (setting.category === 'organization') {
    acc[setting.key] = setting.value;
  }
  return acc;
}, {});
```

✏️ ADD AFTER:
```typescript
const prefs = settingsData.reduce((acc: Record<string, string>, setting: Setting) => {
  if (setting.category === 'preferences') {
    acc[setting.key] = setting.value;
  }
  return acc;
}, {});
```

🔍 FIND:
```typescript
setM365Settings(m365);
setOrganizationSettings(org);
```

✏️ REPLACE WITH:
```typescript
setM365Settings(m365);
setOrganizationSettings(org);
setUserPreferences(prefs);
```

🔍 FIND (after handleSaveOrganizationSettings function):
```typescript
} catch (error) {
  throw error;
}
```

✏️ ADD AFTER:
```typescript
};

// Save user preferences
const handleSaveUserPreferences = async (preferences: Record<string, string>) => {
  try {
    const updates = Object.entries(preferences).map(([key, value]) => ({
      key,
      value,
      category: 'preferences',
    }));

    await settingsService.updateSettings(updates);
    
    // Refresh settings
    const response = await settingsService.getAllSettings();
    const settingsData = response.settings;
    
    const prefs = settingsData.reduce((acc: Record<string, string>, setting: Setting) => {
      if (setting.category === 'preferences') {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {});
    
    setUserPreferences(prefs);
  } catch (error) {
    throw error;
  }
};

// Reset user preferences to defaults
const handleResetUserPreferences = async () => {
  try {
    // Define default preference values
    const defaults: Record<string, string> = {
      pref_date_format: 'MM/DD/YYYY',
      pref_items_per_page: '50',
      pref_default_view: 'table',
      pref_notifications_enabled: 'true',
      pref_show_completed_controls: 'true',
      pref_show_not_started_controls: 'true',
      pref_default_control_family: 'all',
      pref_default_status_filter: 'all',
      pref_default_priority_filter: 'all',
      pref_assessment_reminder_days: '7',
      pref_poam_reminder_days: '7',
      pref_show_family_descriptions: 'true',
      pref_expand_control_details_default: 'false',
      pref_custom_tags: JSON.stringify([]),
      pref_time_format: '12h',
      pref_dashboard_refresh_seconds: '60',
    };

    const updates = Object.entries(defaults).map(([key, value]) => ({
      key,
      value,
      category: 'preferences',
    }));

    await settingsService.updateSettings(updates);
    
    // Refresh settings
    const response = await settingsService.getAllSettings();
    const settingsData = response.settings;
    
    const prefs = settingsData.reduce((acc: Record<string, string>, setting: Setting) => {
      if (setting.category === 'preferences') {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {});
    
    setUserPreferences(prefs);
  } catch (error) {
    throw error;
  }
```

🔍 FIND (at the top of the file):
```typescript
import { M365Settings } from '../components/settings/M365Settings';
import { OrganizationSettings } from '../components/settings/OrganizationSettings';
```

✏️ REPLACE WITH:
```typescript
import { M365Settings } from '../components/settings/M365Settings';
import { OrganizationSettings } from '../components/settings/OrganizationSettings';
import { UserPreferences } from '../components/settings/UserPreferences';
```

---

## Step 4: Create Preferences Hook for Application-Wide Access

### 4.1 Create usePreferences Hook

📁 `client/src/hooks/usePreferences.ts`

🔄 COMPLETE FILE:

```typescript
import { useState, useEffect } from 'react';
import { settingsService } from '../services/settings.service';

interface Preferences {
  dateFormat: string;
  timeFormat: string;
  itemsPerPage: number;
  defaultView: string;
  notificationsEnabled: boolean;
  showCompletedControls: boolean;
  showNotStartedControls: boolean;
  defaultControlFamily: string;
  defaultStatusFilter: string;
  defaultPriorityFilter: string;
  assessmentReminderDays: number;
  poamReminderDays: number;
  showFamilyDescriptions: boolean;
  expandControlDetailsDefault: boolean;
  customTags: string[];
  dashboardRefreshSeconds: number;
}

const defaultPreferences: Preferences = {
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  itemsPerPage: 50,
  defaultView: 'table',
  notificationsEnabled: true,
  showCompletedControls: true,
  showNotStartedControls: true,
  defaultControlFamily: 'all',
  defaultStatusFilter: 'all',
  defaultPriorityFilter: 'all',
  assessmentReminderDays: 7,
  poamReminderDays: 7,
  showFamilyDescriptions: true,
  expandControlDetailsDefault: false,
  customTags: [],
  dashboardRefreshSeconds: 60,
};

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await settingsService.getAllSettings();
      const settings = response.settings;

      // Map settings to preferences object
      const loadedPrefs: Preferences = {
        dateFormat: settings.find(s => s.key === 'pref_date_format')?.value || defaultPreferences.dateFormat,
        timeFormat: settings.find(s => s.key === 'pref_time_format')?.value || defaultPreferences.timeFormat,
        itemsPerPage: parseInt(settings.find(s => s.key === 'pref_items_per_page')?.value || '50'),
        defaultView: settings.find(s => s.key === 'pref_default_view')?.value || defaultPreferences.defaultView,
        notificationsEnabled: settings.find(s => s.key === 'pref_notifications_enabled')?.value === 'true',
        showCompletedControls: settings.find(s => s.key === 'pref_show_completed_controls')?.value === 'true',
        showNotStartedControls: settings.find(s => s.key === 'pref_show_not_started_controls')?.value === 'true',
        defaultControlFamily: settings.find(s => s.key === 'pref_default_control_family')?.value || defaultPreferences.defaultControlFamily,
        defaultStatusFilter: settings.find(s => s.key === 'pref_default_status_filter')?.value || defaultPreferences.defaultStatusFilter,
        defaultPriorityFilter: settings.find(s => s.key === 'pref_default_priority_filter')?.value || defaultPreferences.defaultPriorityFilter,
        assessmentReminderDays: parseInt(settings.find(s => s.key === 'pref_assessment_reminder_days')?.value || '7'),
        poamReminderDays: parseInt(settings.find(s => s.key === 'pref_poam_reminder_days')?.value || '7'),
        showFamilyDescriptions: settings.find(s => s.key === 'pref_show_family_descriptions')?.value === 'true',
        expandControlDetailsDefault: settings.find(s => s.key === 'pref_expand_control_details_default')?.value === 'true',
        customTags: JSON.parse(settings.find(s => s.key === 'pref_custom_tags')?.value || '[]'),
        dashboardRefreshSeconds: parseInt(settings.find(s => s.key === 'pref_dashboard_refresh_seconds')?.value || '60'),
      };

      setPreferences(loadedPrefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    switch (preferences.dateFormat) {
      case 'MM/DD/YYYY':
        return d.toLocaleDateString('en-US');
      case 'DD/MM/YYYY':
        return d.toLocaleDateString('en-GB');
      case 'YYYY-MM-DD':
        return d.toISOString().split('T')[0];
      case 'MMM DD, YYYY':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      default:
        return d.toLocaleDateString();
    }
  };

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (preferences.timeFormat === '24h') {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  };

  const formatDateTime = (date: Date | string): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  return {
    preferences,
    loading,
    formatDate,
    formatTime,
    formatDateTime,
    refreshPreferences: loadPreferences,
  };
};
```

---

## Step 5: Apply Preferences Throughout Application

### 5.1 Example: Apply Pagination Preference to Control Library

📁 `client/src/pages/ControlLibrary.tsx`

🔍 FIND:
```typescript
const [pagination, setPagination] = useState({
  page: 0,
  rowsPerPage: 50,
});
```

✏️ REPLACE WITH:
```typescript
import { usePreferences } from '../hooks/usePreferences';

// Inside component
const { preferences } = usePreferences();

const [pagination, setPagination] = useState({
  page: 0,
  rowsPerPage: preferences.itemsPerPage,
});

// Update when preferences change
useEffect(() => {
  setPagination(prev => ({ ...prev, rowsPerPage: preferences.itemsPerPage }));
}, [preferences.itemsPerPage]);
```

### 5.2 Example: Apply Date Formatting to Dashboard

📁 `client/src/pages/Dashboard.tsx`

🔍 FIND (where dates are displayed):
```typescript
{new Date(activity.timestamp).toLocaleDateString()}
```

✏️ REPLACE WITH:
```typescript
import { usePreferences } from '../hooks/usePreferences';

// Inside component
const { formatDateTime } = usePreferences();

// In render
{formatDateTime(activity.timestamp)}
```

---

## Step 6: Testing & Verification

### 6.1 Manual Testing Checklist

Test the following scenarios:

**Display Preferences:**
- [ ] Change date format and verify it applies across the app
- [ ] Change time format and verify 12h/24h display
- [ ] Adjust items per page and verify pagination updates
- [ ] Change default view and verify control library respects it
- [ ] Adjust dashboard refresh rate and verify auto-refresh behavior

**Default Filters:**
- [ ] Set default family filter and verify control library loads with it
- [ ] Set default status filter and verify application
- [ ] Set default priority filter and verify application
- [ ] Change default filters and verify they persist on page reload

**Control Display Options:**
- [ ] Toggle "Show completed controls" and verify filtering
- [ ] Toggle "Show not started controls" and verify filtering
- [ ] Toggle "Show family descriptions" and verify display
- [ ] Toggle "Expand control details default" and verify behavior

**Notifications:**
- [ ] Enable/disable notifications and verify behavior
- [ ] Set assessment reminder days and verify reminders appear
- [ ] Set POAM reminder days and verify reminders appear

**Custom Tags:**
- [ ] Add new custom tags
- [ ] Remove custom tags
- [ ] Verify tags persist after save
- [ ] Verify tags appear in relevant dropdowns (if implemented in other modules)

**General:**
- [ ] Save preferences and verify success message
- [ ] Reload page and verify preferences persist
- [ ] Reset to defaults and verify all values revert
- [ ] Verify unsaved changes indicator works
- [ ] Verify error handling for failed saves

### 6.2 Automated Testing

📁 `client/src/components/settings/UserPreferences.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserPreferences } from './UserPreferences';

describe('UserPreferences', () => {
  const mockOnSave = jest.fn();
  const mockOnReset = jest.fn();
  const mockPreferences = {
    pref_date_format: 'MM/DD/YYYY',
    pref_items_per_page: '50',
    pref_notifications_enabled: 'true',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all preference sections', () => {
    render(
      <UserPreferences
        onSave={mockOnSave}
        onReset={mockOnReset}
        initialPreferences={mockPreferences}
      />
    );

    expect(screen.getByText('Display Preferences')).toBeInTheDocument();
    expect(screen.getByText('Default Filters')).toBeInTheDocument();
    expect(screen.getByText('Notifications & Reminders')).toBeInTheDocument();
    expect(screen.getByText('Custom Tags')).toBeInTheDocument();
  });

  it('updates preferences when changed', () => {
    render(
      <UserPreferences
        onSave={mockOnSave}
        onReset={mockOnReset}
        initialPreferences={mockPreferences}
      />
    );

    const dateFormatSelect = screen.getByLabelText('Date Format');
    fireEvent.change(dateFormatSelect, { target: { value: 'DD/MM/YYYY' } });

    const saveButton = screen.getByText('Save Preferences');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave when save button is clicked', async () => {
    render(
      <UserPreferences
        onSave={mockOnSave}
        onReset={mockOnReset}
        initialPreferences={mockPreferences}
      />
    );

    const dateFormatSelect = screen.getByLabelText('Date Format');
    fireEvent.change(dateFormatSelect, { target: { value: 'DD/MM/YYYY' } });

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('adds custom tags', () => {
    render(
      <UserPreferences
        onSave={mockOnSave}
        onReset={mockOnReset}
        initialPreferences={mockPreferences}
      />
    );

    const tagInput = screen.getByPlaceholderText('Enter tag name');
    fireEvent.change(tagInput, { target: { value: 'Test Tag' } });

    const addButton = screen.getByText('Add Tag');
    fireEvent.click(addButton);

    expect(screen.getByText('Test Tag')).toBeInTheDocument();
  });
});
```

---

## Step 7: Documentation Updates

### 7.1 Add User Preferences Section to User Guide

📁 `docs/USER_GUIDE.md`

➕ ADD section:

```markdown
## User Preferences

### Accessing Preferences
1. Click Settings in the sidebar
2. Select the "User Preferences" tab

### Display Preferences

**Date Format**: Choose how dates are displayed throughout the application:
- MM/DD/YYYY (US format)
- DD/MM/YYYY (European format)
- YYYY-MM-DD (ISO format)
- MMM DD, YYYY (Text format)

**Time Format**: Choose between 12-hour and 24-hour time display.

**Items Per Page**: Set the number of items displayed per page in tables (10, 25, 50, or 100).

**Default Control View**: Set your preferred view for the control library (Table, Card, or List view).

**Dashboard Refresh**: Set how often (in seconds) the dashboard statistics auto-refresh.

### Default Filters

Set default filters that are automatically applied when you open the control library:
- **Default Control Family**: Pre-select a control family or show all
- **Default Status Filter**: Pre-select a status or show all
- **Default Priority Filter**: Pre-select a priority level or show all

### Control Display Options

- **Show completed controls**: Include completed controls in the library view
- **Show not started controls**: Include not started controls in the library view
- **Show family descriptions**: Display family descriptions in the control library
- **Expand control details by default**: Automatically expand control details when viewing

### Notifications & Reminders

- **Enable in-app notifications**: Toggle all in-app notifications on or off
- **Assessment Reminder**: Set how many days before an assessment due date to show a reminder
- **POAM Reminder**: Set how many days before a POAM due date to show a reminder

### Custom Tags

Create custom tags to organize controls, assessments, and POAMs:
1. Enter a tag name in the "New Tag" field
2. Click "Add Tag"
3. Remove tags by clicking the X icon on the tag chip

Tags can be used throughout the application to categorize and filter items.

### Saving Preferences

- Click "Save Preferences" to save your changes
- Changes are applied immediately after saving
- Preferences persist across sessions

### Resetting to Defaults

Click "Reset to Defaults" to restore all preferences to their original values. This action requires confirmation.
```

---

## Common Issues & Solutions

### Issue 1: Preferences not applying immediately
**Solution**: Ensure components are using the `usePreferences` hook and watching for changes via `useEffect`.

### Issue 2: Custom tags not persisting
**Solution**: Verify that JSON.stringify/JSON.parse is handling the tags array correctly in the database.

### Issue 3: Date format not applying to all dates
**Solution**: Search codebase for date display logic and ensure all instances use the `formatDate` helper from `usePreferences`.

### Issue 4: Reset to defaults not working
**Solution**: Verify default values match between the reset handler and the database seed file.

---

## Success Criteria

- [ ] User Preferences tab added to Settings page
- [ ] All display preferences functional (date/time format, pagination, view)
- [ ] Default filters persist and apply correctly
- [ ] Control display options work as expected
- [ ] Notification preferences save and apply
- [ ] Custom tags can be created, saved, and removed
- [ ] usePreferences hook provides access to preferences
- [ ] Date/time formatting helpers work correctly
- [ ] Save functionality works without errors
- [ ] Reset to defaults restores all values
- [ ] Preferences persist across page reloads
- [ ] All tests pass
- [ ] Documentation updated

---

## Next Steps

After completing Phase 8.2, proceed to:
**Phase 8.3: Data Management & Backup** - Implement database backup/restore, data export/import, and integrity validation.
