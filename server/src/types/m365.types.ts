// Microsoft 365 Integration Types

export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
export type MappingConfidence = 'High' | 'Medium' | 'Low';
export type SyncStatus = 'Success' | 'Failed' | 'Partial';
export type SyncType = 'Manual' | 'Automatic';

// M365 Policy Interface
export interface M365Policy {
  id: number;
  policyType: PolicyType;
  policyId: string;
  policyName: string;
  policyDescription?: string;
  policyData: string; // JSON string
  lastSynced: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Control to Policy Mapping
export interface ControlPolicyMapping {
  id: number;
  controlId: number;
  policyId: number;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
  createdAt: Date;
}

// M365 Settings
export interface M365Settings {
  id: number;
  tenantId?: string;
  clientId?: string;
  lastSyncDate?: Date;
  syncEnabled: boolean;
  autoSyncInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sync Log Entry
export interface M365SyncLog {
  id: number;
  syncDate: Date;
  syncType: SyncType;
  policiesUpdated: number;
  controlsUpdated: number;
  status: SyncStatus;
  errorMessage?: string;
  syncDuration?: number;
  createdAt: Date;
}

// API Response Types
export interface SyncResult {
  success: boolean;
  policiesUpdated: number;
  controlsUpdated: number;
  duration: number;
  errors?: string[];
}

// Intune Policy Data Structures
export interface IntuneDeviceCompliancePolicy {
  '@odata.type': string;
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  passwordRequired?: boolean;
  passwordMinimumLength?: number;
  requireHealthyDeviceReport?: boolean;
  osMinimumVersion?: string;
  osMaximumVersion?: string;
}

export interface IntuneConfigurationPolicy {
  '@odata.type': string;
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  platformType?: string;
}

// Purview Policy Data Structures
export interface PurviewDLPPolicy {
  Identity: string;
  Name: string;
  Comment?: string;
  Enabled: boolean;
  Mode: string;
  CreatedBy: string;
  LastModifiedBy: string;
  CreatedTime: string;
  LastModifiedTime: string;
}

export interface PurviewSensitivityLabel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sensitivity: number;
  parentId?: string;
}

// Azure AD Policy Data Structures
export interface AzureADConditionalAccessPolicy {
  id: string;
  displayName: string;
  state: string; // enabled, disabled, enabledForReportingButNotEnforced
  createdDateTime: string;
  modifiedDateTime: string;
  conditions: {
    users?: any;
    applications?: any;
    locations?: any;
    signInRiskLevels?: string[];
  };
  grantControls?: {
    operator: string;
    builtInControls: string[];
  };
}

export interface AzureADMFAStatus {
  enabled: boolean;
  enforcementMethod: string; // 'ConditionalAccess' | 'PerUserMFA' | 'SecurityDefaults'
  totalUsers: number;
  usersWithMFA: number;
  percentageCompliance: number;
}

// Mapping Template Interface (for predefined mappings)
export interface ControlPolicyMappingTemplate {
  controlId: string; // e.g., "3.1.1"
  policyTypes: PolicyType[];
  searchCriteria: {
    nameContains?: string[];
    policyTypeSpecific?: any;
  };
  mappingConfidence: MappingConfidence;
  mappingReason: string;
}
