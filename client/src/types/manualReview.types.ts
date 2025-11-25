// client/src/types/manualReview.types.ts

export type ManualComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

export interface ManualSettingReview {
  id: number;
  settingId: number;
  policyId: number | null;
  controlId: number | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  manualComplianceStatus: ManualComplianceStatus | null;
  manualExpectedValue: string | null;
  manualActualValue: string | null;
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualSettingReviewCreate {
  settingId: number;
  policyId?: number;
  controlId?: number;
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale: string;
}

export interface ManualSettingReviewUpdate {
  isReviewed?: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale?: string;
}

export interface PolicyForSelector {
  id: number;
  policyName: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyDescription: string | null;
  odataType: string | null;
  templateFamily: string | null;
  isActive: boolean;
  lastSynced: string;
}

export interface CatalogSettingComparison {
  id: number;
  displayName: string;
  settingPath: string;
  expectedValue: string;
  description: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN';
  actualValue: string | null;
  isCompliant: boolean | null;
  manualReview: ManualSettingReview | null;
}

export interface PolicySettingsComparison {
  policy: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
    templateFamily: string | null;
  };
  catalogSettings: CatalogSettingComparison[];
  uncataloguedSettings: Array<{
    path: string;
    value: any;
  }>;
  summary: {
    totalCatalogSettings: number;
    configuredCount: number;
    notConfiguredCount: number;
    uncataloguedCount: number;
    reviewedCount: number;
  };
}

// For the association modal
export interface SettingAssociationData {
  setting: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
    policyType: string;
    platform: string;
  };
  selectedPolicy: PolicyForSelector | null;
  policySettings: Record<string, any> | null;
  manualExpectedValue: string;
  manualComplianceStatus: ManualComplianceStatus | null;
  rationale: string;
}
