# Phase 8.4.1: Preferences Settings Tab - Detailed Implementation

## Component: PreferencesSettingsTab.tsx

### Full Implementation with Dark Theme

```typescript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Divider,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { UserPreferences } from '../../types/settings.types';

interface PreferencesSettingsTabProps {
  settings: UserPreferences;
  onUpdate: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dateFormat: 'MM/DD/YYYY',
  itemsPerPage: 50,
  defaultView: 'table',
  notificationsEnabled: true,
  showToastNotifications: true,
  autoSaveEnabled: false,
  confirmBeforeDelete: true,
};

export const PreferencesSettingsTab: React.FC<PreferencesSettingsTabProps> = ({
  settings,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<UserPreferences>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleSelectChange = (field: keyof UserPreferences) => (
    event: SelectChangeEvent<string | number>
  ) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      [field]: field === 'itemsPerPage' ? Number(value) : value,
    });
    setMessage(null);
  };

  const handleSwitchChange = (field: keyof UserPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.checked });
    setMessage(null);
  };

  const handleRadioChange = (field: keyof UserPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      await settingsService.updateSettingsCategory('preferences', {
        date_format: formData.dateFormat,
        items_per_page: formData.itemsPerPage.toString(),
        default_view: formData.defaultView,
        notifications_enabled: formData.notificationsEnabled.toString(),
        show_toast_notifications: formData.showToastNotifications.toString(),
        auto_save_enabled: formData.autoSaveEnabled.toString(),
        confirm_before_delete: formData.confirmBeforeDelete.toString(),
      });

      setMessage({
        type: 'success',
        text: 'Preferences saved successfully!',
      });

      onUpdate();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save preferences. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setMessage(null);

      // Update to default preferences
      await settingsService.updateSettingsCategory('preferences', {
        date_format: DEFAULT_PREFERENCES.dateFormat,
        items_per_page: DEFAULT_PREFERENCES.itemsPerPage.toString(),
        default_view: DEFAULT_PREFERENCES.defaultView,
        notifications_enabled: DEFAULT_PREFERENCES.notificationsEnabled.toString(),
        show_toast_notifications: DEFAULT_PREFERENCES.showToastNotifications.toString(),
        auto_save_enabled: DEFAULT_PREFERENCES.autoSaveEnabled.toString(),
        confirm_before_delete: DEFAULT_PREFERENCES.confirmBeforeDelete.toString(),
      });

      setFormData(DEFAULT_PREFERENCES);
      setMessage({
        type: 'info',
        text: 'Preferences reset to defaults.',
      });

      onUpdate();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to reset preferences. Please try again.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  return (
    <Box sx={{ p: 3 }}>
      {/* Success/Error Messages */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Display Settings Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
          Display Settings
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Date Format */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#B0B0B0' }}>Date Format</InputLabel>
            <Select
              value={formData.dateFormat}
              onChange={handleSelectChange('dateFormat')}
              label="Date Format"
              sx={{
                backgroundColor: '#242424',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '& .MuiSelect-select': {
                  color: '#E0E0E0',
                },
              }}
            >
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (11/11/2025)</MenuItem>
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (11/11/2025)</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (2025-11-11)</MenuItem>
              <MenuItem value="MMM DD, YYYY">MMM DD, YYYY (Nov 11, 2025)</MenuItem>
            </Select>
          </FormControl>

          {/* Items Per Page */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#B0B0B0' }}>Items Per Page</InputLabel>
            <Select
              value={formData.itemsPerPage}
              onChange={handleSelectChange('itemsPerPage')}
              label="Items Per Page"
              sx={{
                backgroundColor: '#242424',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '& .MuiSelect-select': {
                  color: '#E0E0E0',
                },
              }}
            >
              <MenuItem value={10}>10 items</MenuItem>
              <MenuItem value={25}>25 items</MenuItem>
              <MenuItem value={50}>50 items</MenuItem>
              <MenuItem value={100}>100 items</MenuItem>
            </Select>
          </FormControl>

          {/* Default View */}
          <FormControl component="fieldset">
            <Typography sx={{ color: '#B0B0B0', mb: 1, fontSize: '0.875rem' }}>
              Default View
            </Typography>
            <RadioGroup
              value={formData.defaultView}
              onChange={handleRadioChange('defaultView')}
              row
            >
              <FormControlLabel
                value="table"
                control={<Radio sx={{ color: '#90CAF9' }} />}
                label="Table View"
                sx={{ color: '#E0E0E0' }}
              />
              <FormControlLabel
                value="grid"
                control={<Radio sx={{ color: '#90CAF9' }} />}
                label="Grid View"
                sx={{ color: '#E0E0E0' }}
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>

      {/* Notification Settings Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
          Notification Settings
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.notificationsEnabled}
                onChange={handleSwitchChange('notificationsEnabled')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#90CAF9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#90CAF9',
                  },
                }}
              />
            }
            label="Enable Email Notifications"
            sx={{ color: '#E0E0E0' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.showToastNotifications}
                onChange={handleSwitchChange('showToastNotifications')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#90CAF9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#90CAF9',
                  },
                }}
              />
            }
            label="Show In-App Toast Notifications"
            sx={{ color: '#E0E0E0' }}
          />
        </Box>

        <Typography
          variant="caption"
          sx={{ color: '#B0B0B0', display: 'block', mt: 1 }}
        >
          Receive notifications about assessment due dates, POAM deadlines, and system
          updates.
        </Typography>
      </Paper>

      {/* General Settings Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
          General Settings
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.autoSaveEnabled}
                onChange={handleSwitchChange('autoSaveEnabled')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#90CAF9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#90CAF9',
                  },
                }}
              />
            }
            label="Auto-save Form Changes"
            sx={{ color: '#E0E0E0' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.confirmBeforeDelete}
                onChange={handleSwitchChange('confirmBeforeDelete')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#90CAF9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#90CAF9',
                  },
                }}
              />
            }
            label="Confirm Before Deleting Items"
            sx={{ color: '#E0E0E0' }}
          />
        </Box>

        <Typography
          variant="caption"
          sx={{ color: '#B0B0B0', display: 'block', mt: 1 }}
        >
          Auto-save will automatically save your changes after 3 seconds of inactivity.
        </Typography>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={isResetting || isSaving}
          startIcon={isResetting ? <CircularProgress size={16} /> : <RestartAlt />}
          sx={{
            color: '#B0B0B0',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Reset to Defaults
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges || isSaving || isResetting}
          startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
          sx={{
            backgroundColor: '#90CAF9',
            color: '#121212',
            '&:hover': {
              backgroundColor: '#64B5F6',
            },
            '&.Mui-disabled': {
              backgroundColor: '#424242',
              color: '#757575',
            },
          }}
        >
          Save Changes
        </Button>
      </Box>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <Alert severity="info" sx={{ mt: 2 }}>
          You have unsaved changes. Click "Save Changes" to apply your preferences.
        </Alert>
      )}
    </Box>
  );
};

export default PreferencesSettingsTab;
```

## Type Updates

### Update client/src/types/settings.types.ts

```typescript
export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
  showToastNotifications: boolean;
  autoSaveEnabled: boolean;
  confirmBeforeDelete: boolean;
}
```

### Update server/src/types/settings.types.ts

```typescript
export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
  showToastNotifications: boolean;
  autoSaveEnabled: boolean;
  confirmBeforeDelete: boolean;
}
```

## Update Settings Service

### Update server/src/services/settings.service.ts

In the `parseUserPreferences` method:

```typescript
private parseUserPreferences(settings: any[]): UserPreferences {
  const prefs = settings.filter((s) => s.category === 'preferences');
  return {
    dateFormat: this.findValue(prefs, 'pref_date_format') || 'MM/DD/YYYY',
    itemsPerPage: parseInt(this.findValue(prefs, 'pref_items_per_page') || '50'),
    defaultView: (this.findValue(prefs, 'pref_default_view') || 'table') as 'table' | 'grid',
    notificationsEnabled: this.findValue(prefs, 'pref_notifications_enabled') === 'true',
    showToastNotifications: this.findValue(prefs, 'pref_show_toast_notifications') === 'true',
    autoSaveEnabled: this.findValue(prefs, 'pref_auto_save_enabled') === 'true',
    confirmBeforeDelete: this.findValue(prefs, 'pref_confirm_before_delete') === 'true',
  };
}
```

## Update Database Seed

### Update server/prisma/seed.ts

Add new preference settings:

```typescript
// User Preferences
{ key: 'pref_date_format', value: 'MM/DD/YYYY', category: 'preferences' },
{ key: 'pref_items_per_page', value: '50', category: 'preferences' },
{ key: 'pref_default_view', value: 'table', category: 'preferences' },
{ key: 'pref_notifications_enabled', value: 'true', category: 'preferences' },
{ key: 'pref_show_toast_notifications', value: 'true', category: 'preferences' },
{ key: 'pref_auto_save_enabled', value: 'false', category: 'preferences' },
{ key: 'pref_confirm_before_delete', value: 'true', category: 'preferences' },
```

## Update Settings Page

### Update client/src/pages/Settings.tsx

Replace the Preferences tab placeholder:

```typescript
import PreferencesSettingsTab from '../components/settings/PreferencesSettingsTab';

// In the TabPanel section for index 2:
<TabPanel value={activeTab} index={2}>
  {settings && (
    <PreferencesSettingsTab settings={settings.preferences} onUpdate={refetch} />
  )}
</TabPanel>
```

## Testing Checklist

- [ ] Component renders without errors
- [ ] All form fields display current values
- [ ] Date format dropdown works
- [ ] Items per page dropdown works
- [ ] Default view radio buttons work
- [ ] All switches toggle correctly
- [ ] Save button is disabled when no changes
- [ ] Save button shows loading state
- [ ] Success message appears after save
- [ ] Reset to defaults works
- [ ] Reset shows confirmation
- [ ] Changes persist after page refresh
- [ ] Dark theme styling is consistent
- [ ] Error handling works properly

## Common Issues and Solutions

### Issue: Settings not persisting
**Solution**: Verify the settings service is calling the correct API endpoint and the backend is updating the database.

### Issue: TypeScript errors
**Solution**: Ensure all type definitions are updated in both client and server type files.

### Issue: Switch not toggling
**Solution**: Check that the onChange handler is correctly updating state and the checked prop is bound to formData.

### Issue: Form validation failing
**Solution**: Add validation logic in the handleSave function before calling the API.

## Next Steps

After completing the Preferences tab:
1. Test thoroughly with different settings combinations
2. Verify persistence across page refreshes
3. Test error scenarios (network failures, invalid values)
4. Move on to Data Management tab implementation
