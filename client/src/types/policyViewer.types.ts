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

export type PolicyTypeTab = 'all' | 'Intune' | 'Purview' | 'AzureAD';
