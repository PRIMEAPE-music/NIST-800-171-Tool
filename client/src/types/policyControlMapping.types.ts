/**
 * Types for Policy Control Mappings
 * Used to display which settings from a policy are validated and mapped to controls
 */

export interface ManualReviewSummary {
  id: number;
  manualComplianceStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | null;
  rationale: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  evidenceCount: number;
}

export interface MappedControl {
  controlId: string;
  controlTitle: string;
  controlFamily: string;
}

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
  mappingStatus?: 'CONFIRMED' | 'POTENTIAL'; // NEW: Whether this is a confirmed or potential mapping
  settingDescription?: string;
  settingPath?: string;
  implementationGuide?: string;
  microsoftDocsUrl?: string;
  mappedControls?: MappedControl[];
  manualReview?: ManualReviewSummary | null;
}

export interface PolicyControlMappingControl {
  controlId: string;
  controlTitle: string;
  family: string;
  settings: PolicyControlMappingSetting[];
}

export interface PolicyControlMappingSummary {
  totalSettings: number;
  confirmedSettings: number; // NEW: Count of confirmed mappings
  potentialSettings: number; // NEW: Count of potential mappings
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
