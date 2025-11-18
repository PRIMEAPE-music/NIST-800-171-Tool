// TypeScript types for M365 Settings components

export interface M365SettingItem {
  id: string;
  displayName: string;
  policyType: string;
  platform: string | null;
  confidence: 'High' | 'Medium' | 'Low';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED' | 'NOT_CHECKED';
  lastChecked?: string;
}

export interface M365SettingDetail {
  id: string;
  displayName: string;
  description: string | null;
  policyType: string;
  platform: string | null;
  settingPath: string;
  expectedValue: string;
  validationOperator: string;
  confidence: string;
  implementationGuide?: string;
  microsoftDocsUrl?: string;
  complianceCheck?: {
    status: string;
    actualValue: string | null;
    isCompliant: boolean;
    lastChecked: string;
    errorMessage?: string;
  };
  mappedControls: Array<{
    controlId: string;
    controlTitle: string;
    family: string;
  }>;
}

export interface ControlSettingsSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  notConfigured: number;
  notChecked: number;
}

export interface ControlSettingsResponse {
  controlId: string;
  controlTitle: string;
  settings: M365SettingItem[];
  summary: ControlSettingsSummary;
}

export interface M365SettingsApiResponse {
  success: boolean;
  data: ControlSettingsResponse;
}

export interface FilterState {
  policyType: string;
  platform: string;
  confidenceLevel: string;
  complianceStatus: string;
  searchQuery: string;
}

export interface GroupedSettings {
  High: M365SettingItem[];
  Medium: M365SettingItem[];
  Low: M365SettingItem[];
}
