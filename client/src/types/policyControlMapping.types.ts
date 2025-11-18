/**
 * Types for Policy Control Mappings
 * Used to display which settings from a policy are validated and mapped to controls
 */

export interface PolicyControlMappingSetting {
  settingId: number;
  settingName: string;
  expectedValue: any;
  actualValue: any;
  isCompliant: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  validationOperator: string;
  policyType: string;
  platform: string;
  lastChecked: string;
}

export interface PolicyControlMappingControl {
  controlId: string;
  controlTitle: string;
  family: string;
  settings: PolicyControlMappingSetting[];
}

export interface PolicyControlMappingSummary {
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  controlsAffected: number;
}

export interface PolicyControlMappingData {
  policyId: number;
  policyName: string;
  policyType: string;
  summary: PolicyControlMappingSummary;
  controls: PolicyControlMappingControl[];
}

export interface PolicyControlMappingResponse {
  success: boolean;
  data: PolicyControlMappingData;
}
