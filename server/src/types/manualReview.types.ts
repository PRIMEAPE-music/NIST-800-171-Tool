// server/src/types/manualReview.types.ts

export type ManualComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

export interface ManualSettingReviewCreate {
  settingId: number;
  policyId?: number;
  controlId?: number;
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale: string; // Required
  reviewedBy?: string;
}

export interface ManualSettingReviewUpdate {
  isReviewed?: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale?: string;
  reviewedBy?: string;
}

export interface ManualSettingReviewResponse {
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
  // Populated relations
  setting?: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
  };
  policy?: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
  };
}

export interface PolicySettingsComparisonResult {
  policy: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
    templateFamily: string | null;
  };
  // Settings from catalog that match this policy's template
  catalogSettings: Array<{
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string;
    status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN';
    actualValue: string | null;
    isCompliant: boolean | null;
    manualReview: ManualSettingReviewResponse | null;
  }>;
  // Settings found in policy but not in catalog
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
