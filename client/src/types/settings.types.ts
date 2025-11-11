/**
 * Settings Types
 * Frontend type definitions for application settings
 */

export interface M365Settings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  lastSync?: string;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
}

export interface OrganizationSettings {
  name: string;
  complianceOfficerName: string;
  complianceOfficerEmail: string;
  assessmentFrequencyDays: number;
}

export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
}

export interface SystemSettings {
  lastBackup?: string;
  autoBackupEnabled: boolean;
}

export interface AllSettings {
  m365: M365Settings;
  organization: OrganizationSettings;
  preferences: UserPreferences;
  system: SystemSettings;
}

export interface ConnectionTestResult {
  connected: boolean;
  message: string;
  timestamp: string;
  details?: {
    tenantId?: string;
    organizationName?: string;
    error?: string;
  };
}
