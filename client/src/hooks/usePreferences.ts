import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const loadPreferences = useCallback(async () => {
    try {
      const response = await settingsService.getAllSettings();
      const prefs = response.preferences;

      // Map settings to preferences object
      const loadedPrefs: Preferences = {
        dateFormat: prefs.dateFormat || defaultPreferences.dateFormat,
        timeFormat: prefs.timeFormat || defaultPreferences.timeFormat,
        itemsPerPage: prefs.itemsPerPage || defaultPreferences.itemsPerPage,
        defaultView: prefs.defaultView || defaultPreferences.defaultView,
        notificationsEnabled: prefs.notificationsEnabled,
        showCompletedControls: prefs.showCompletedControls,
        showNotStartedControls: prefs.showNotStartedControls,
        defaultControlFamily: prefs.defaultControlFamily || defaultPreferences.defaultControlFamily,
        defaultStatusFilter: prefs.defaultStatusFilter || defaultPreferences.defaultStatusFilter,
        defaultPriorityFilter: prefs.defaultPriorityFilter || defaultPreferences.defaultPriorityFilter,
        assessmentReminderDays: prefs.assessmentReminderDays || defaultPreferences.assessmentReminderDays,
        poamReminderDays: prefs.poamReminderDays || defaultPreferences.poamReminderDays,
        showFamilyDescriptions: prefs.showFamilyDescriptions,
        expandControlDetailsDefault: prefs.expandControlDetailsDefault,
        customTags: JSON.parse(prefs.customTags || '[]'),
        dashboardRefreshSeconds: prefs.dashboardRefreshSeconds || defaultPreferences.dashboardRefreshSeconds,
      };

      setPreferences(loadedPrefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const formatDate = useCallback((date: Date | string): string => {
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
  }, [preferences.dateFormat]);

  const formatTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (preferences.timeFormat === '24h') {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }, [preferences.timeFormat]);

  const formatDateTime = useCallback((date: Date | string): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  }, [formatDate, formatTime]);

  return useMemo(() => ({
    preferences,
    loading,
    formatDate,
    formatTime,
    formatDateTime,
    refreshPreferences: loadPreferences,
  }), [preferences, loading, formatDate, formatTime, formatDateTime, loadPreferences]);
};
