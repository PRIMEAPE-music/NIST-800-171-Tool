// Microsoft 365 Integration Types

export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
// REMOVED: MappingConfidence type - no longer mapping policies to controls
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

// REMOVED: ControlPolicyMapping interface - no longer mapping policies to controls

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
  duration: number;
  errors?: string[];
  addedPolicyIds?: number[];
  updatedPolicyIds?: number[];
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

/**
 * Azure AD Security Summary including PIM
 */
export interface AzureADSecuritySummary {
  conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
  mfaStatus: AzureADMFAStatus;
  securityDefaultsEnabled: boolean;
  privilegedRolesCount: number;
  pimPolicies: any[];
  pimAssignments: any[];
}

// REMOVED: ControlPolicyMappingTemplate interface - no longer mapping policies to controls

// ============================================
// VALIDATION ENGINE TYPES (Phase 3)
// ============================================

/**
 * Supported validation operators for comparing policy values
 */
export type ValidationOperator = '==' | '>=' | '<=' | 'contains' | 'in' | 'matches';

/**
 * Supported data types for validation
 */
export type ValidationType = 'boolean' | 'integer' | 'string' | 'array' | 'object';

/**
 * Result of a single validation operation
 */
export interface ValidationResult {
  isValid: boolean;
  actualValue: any;
  expectedValue: any;
  operator: ValidationOperator;
  errorMessage?: string;
}

/**
 * Complete validation check result with metadata
 */
export interface SettingValidationResult {
  settingId: string;
  settingName: string;
  policyType: string;
  isCompliant: boolean;
  validationResult: ValidationResult;
  timestamp: Date;
}

/**
 * Batch validation results for multiple settings
 */
export interface BatchValidationResult {
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  results: SettingValidationResult[];
}

/**
 * JSON Path extraction result
 */
export interface PathExtractionResult {
  success: boolean;
  value?: any;
  error?: string;
}
