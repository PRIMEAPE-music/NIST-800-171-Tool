// Shared M365 types between client and server

export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
export type MappingConfidence = 'High' | 'Medium' | 'Low';
export type SyncStatus = 'Success' | 'Failed' | 'Partial';

// Frontend-safe M365 Policy (no sensitive data)
export interface M365PolicyDTO {
  id: number;
  policyType: PolicyType;
  policyName: string;
  policyDescription?: string;
  lastSynced: string; // ISO date string
  isActive: boolean;
  mappedControlsCount: number;
}

// Control Mapping DTO
export interface ControlPolicyMappingDTO {
  id: number;
  controlId: string; // "3.1.1" format
  controlTitle: string;
  policyId: number;
  policyName: string;
  policyType: PolicyType;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
}

// Integration Status
export interface M365IntegrationStatus {
  connected: boolean;
  lastSyncDate?: string;
  tenantId?: string;
  policyCounts: {
    intune: number;
    purview: number;
    azureAD: number;
    total: number;
  };
  autoSyncEnabled: boolean;
  autoSyncInterval: number;
}

// Sync Request/Response
export interface SyncRequest {
  policyTypes?: PolicyType[]; // If empty, sync all
  forceRefresh?: boolean;
}

export interface SyncResponse {
  success: boolean;
  syncDate: string;
  policiesUpdated: number;
  controlsUpdated: number;
  duration: number;
  errors?: string[];
}

// M365 Dashboard Stats
export interface M365DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  mappedControls: number;
  unmappedControls: number;
  lastSyncDate?: string;
  integrationHealth: 'Healthy' | 'Warning' | 'Error' | 'Not Connected';
  policyBreakdown: {
    intune: number;
    purview: number;
    azureAD: number;
  };
}
