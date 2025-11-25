export interface PolicyDetail {
  id: number;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyId: string;
  policyName: string;
  policyDescription: string | null;
  lastSynced: string;
  isActive: boolean;
  parsedData: ParsedPolicyData;
  mappedControls: MappedControl[];
}

export interface ParsedPolicyData {
  displayName: string;
  description?: string;
  createdDateTime?: string;
  modifiedDateTime?: string;
  settings: Record<string, any>;
  odataType?: string;
  platformType?: string;
}

export interface MappedControl {
  controlId: string;
  controlTitle: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
}

export interface PolicyViewerStats {
  totalPolicies: number;
  activePolicies: number;
  inactivePolicies: number;
  byType: {
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
  lastSyncDate: string | null;
  policiesWithMappings: number;
}

export interface PolicySearchParams {
  policyType?: 'Intune' | 'Purview' | 'AzureAD';
  searchTerm?: string;
  isActive?: boolean;
  controlId?: string;
  sortBy?: 'name' | 'lastSynced' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export type PolicyTypeTab = 'all' | 'Intune' | 'Purview' | 'AzureAD' | 'allSettings';

// ============================================================================
// Policy Settings to Controls Types (Inverse Mapping)
// ============================================================================

export interface PolicySettingToControl {
  // Setting metadata
  id: number;
  settingId: number;
  settingName: string;
  settingDescription: string | null;
  settingPath: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  platform: string;

  // Policy info (optional - only present in all-settings view)
  policyId?: number;
  policyName?: string;

  // Compliance data
  expectedValue: string;
  actualValue: string | null;
  isCompliant: boolean;
  complianceMessage: string | null;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED';
  lastChecked: string;

  // Validation details
  validationOperator: string | null;
  implementationGuide: string | null;
  microsoftDocsUrl: string | null;

  // Confidence
  confidence: 'High' | 'Medium' | 'Low' | 'Unknown';

  // Mapped controls
  mappedControls: MappedControlForSetting[];

  // Manual review data
  manualReview?: {
    id: number;
    isReviewed: boolean;
    reviewedAt: string | null;
    manualComplianceStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | null;
    manualExpectedValue: string | null;
    rationale: string;
  } | null;
}

export interface MappedControlForSetting {
  controlId: string; // e.g., "03.01.01"
  controlTitle: string;
  controlFamily: string; // e.g., "AC"
  controlPriority: 'Critical' | 'High' | 'Medium' | 'Low';
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingRationale: string | null;
  isRequired: boolean;
}

export interface PolicySettingsToControlsSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  notConfigured: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byFamily: Record<string, number>;
  byPlatform: Record<string, number>;
  byPolicyType?: Record<string, number>; // Only present in all-settings view
}

export interface PolicySettingsToControlsResponse {
  success: boolean;
  policy: {
    id: number;
    name: string;
    type: 'Intune' | 'Purview' | 'AzureAD';
  };
  settings: PolicySettingToControl[];
  summary: PolicySettingsToControlsSummary;
}

export interface AllSettingsToControlsResponse {
  success: boolean;
  settings: PolicySettingToControl[];
  summary: PolicySettingsToControlsSummary;
}

// Filter types for the new tab
export interface SettingsToControlsFilters {
  searchQuery: string;
  policyType: string; // 'all' | specific type
  platform: string; // 'all' | specific platform
  controlPriority: string; // 'all' | 'Critical' | 'High' | 'Medium' | 'Low'
  controlFamily: string; // 'all' | family code
  complianceStatus: string; // 'all' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED'
}

export type ViewMode = 'table' | 'card';
