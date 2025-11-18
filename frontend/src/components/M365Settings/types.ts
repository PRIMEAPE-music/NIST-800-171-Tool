// TypeScript types for M365 Settings components

export interface M365Setting {
  id: string;
  displayName: string;
  description: string | null;
  policyType: string;
  platform: string | null;
  expectedValue: string | null;
  validationOperator: string | null;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  implementationGuide: string | null;
  microsoftDocsUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ControlSettingMapping {
  id: string;
  m365SettingId: string;
  controlId: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string | null;
  m365Setting: M365Setting;
  complianceCheck?: SettingComplianceCheck | null;
}

export interface SettingComplianceCheck {
  id: string;
  m365SettingId: string;
  m365PolicyId: string | null;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED';
  actualValue: string | null;
  expectedValue: string | null;
  lastChecked: string;
  validationDetails: any | null;
}

export interface ControlM365Compliance {
  controlId: string;
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  compliancePercentage: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  windowsCoverage: boolean;
  iosCoverage: boolean;
  androidCoverage: boolean;
  lastCalculated: string;
}

export interface M365SettingsResponse {
  mappings: ControlSettingMapping[];
  compliance: ControlM365Compliance | null;
}

export interface FilterState {
  policyType: string;
  platform: string;
  confidenceLevel: string;
  complianceStatus: string;
  searchQuery: string;
}

export interface GroupedSettings {
  HIGH: ControlSettingMapping[];
  MEDIUM: ControlSettingMapping[];
  LOW: ControlSettingMapping[];
}
