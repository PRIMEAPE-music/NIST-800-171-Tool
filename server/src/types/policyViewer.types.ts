// Policy Viewer Specific Types

export interface PolicyDetail {
  id: number;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyId: string;
  policyName: string;
  policyDescription: string | null;
  lastSynced: Date;
  isActive: boolean;
  parsedData: ParsedPolicyData;
  mappedControls: MappedControl[];
}

export interface ParsedPolicyData {
  // Common fields
  displayName: string;
  description?: string;
  createdDateTime?: string;
  modifiedDateTime?: string;

  // Type-specific fields will be in 'settings' object
  settings: Record<string, any>;

  // Metadata
  odataType?: string;
  platformType?: string;
}

export interface MappedSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: any;
  validationType?: string;
  validationMessage?: string;
}

export interface MappedControl {
  controlId: string;
  controlTitle: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
  mappedSettings?: MappedSetting[]; // Settings that contribute to this mapping
}

export interface PolicySearchParams {
  policyType?: 'Intune' | 'Purview' | 'AzureAD';
  searchTerm?: string;
  isActive?: boolean;
  controlId?: string;
  sortBy?: 'name' | 'lastSynced' | 'type';
  sortOrder?: 'asc' | 'desc';
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
  lastSyncDate: Date | null;
  policiesWithMappings: number;
}

export interface PolicyExportData {
  exportDate: Date;
  policies: PolicyDetail[];
  stats: PolicyViewerStats;
}
