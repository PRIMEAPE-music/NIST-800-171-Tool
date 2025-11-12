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
