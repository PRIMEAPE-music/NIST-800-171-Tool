/**
 * Type definitions for Settings-Based NIST Control Mapping
 */

// ============================================================================
// Settings Mapping Library Types
// ============================================================================

export type ValidationRuleType =
  | 'boolean'
  | 'numeric'
  | 'string'
  | 'array'
  | 'object'
  | 'duration';

export interface NumericValidationRule {
  min?: number;
  max?: number;
  exact?: number;
}

export interface ArrayValidationRule {
  minLength?: number;
  maxLength?: number;
  contains?: any[];
  empty?: boolean;
}

export interface ObjectValidationRule {
  exists?: boolean;
  [key: string]: any; // Allow deep property matching
}

export interface DurationValidationRule {
  minDuration?: string; // ISO 8601 duration (e.g., "P30D")
  maxDuration?: string;
}

export type ValidationRule =
  | boolean // For boolean type
  | string[] // For string type (list of allowed values)
  | NumericValidationRule // For numeric type
  | ArrayValidationRule // For array type
  | ObjectValidationRule // For object type
  | DurationValidationRule; // For duration type

export interface SettingMapping {
  settingNames: string[]; // Array of synonyms (e.g., ["passwordMinimumLength", "passcodeMinimumLength"])
  validationType: ValidationRuleType;
  requiredValue: ValidationRule;
  policyTypes: ('Intune' | 'Purview' | 'AzureAD')[]; // Which policy types this applies to
  description: string;
}

export interface ControlMappingDefinition {
  controlId: string; // e.g., "03.05.07"
  title: string;
  family: string; // AC, IA, SC, etc.
  settingMappings: SettingMapping[];
}

export interface SettingsMappingLibrary {
  $schema: string;
  version: string;
  lastUpdated: string;
  description: string;
  controls: {
    [controlId: string]: ControlMappingDefinition;
  };
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface SettingValidationResult {
  settingName: string;
  settingValue: any;
  requiredValue: ValidationRule;
  validationType: ValidationRuleType;
  meetsRequirement: boolean;
  compliancePercentage: number; // 0-100
  validationMessage: string;
}

export interface ControlMappingResult {
  controlId: string;
  controlTitle: string;
  mappedSettings: MappedSetting[];
  overallConfidence: number; // 0-100
  confidenceLevel: 'High' | 'Medium' | 'Low';
  mappingNotes: string;
}

export interface MappedSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: ValidationRule;
  validationType?: ValidationRuleType;
  validationMessage?: string;
}

// ============================================================================
// Policy Mapping Types
// ============================================================================

export interface PolicySettings {
  [settingName: string]: any;
}

export interface PolicyMappingInput {
  policyId: number;
  policyExternalId: string;
  policyName: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  settings: PolicySettings;
}

export interface PolicyMappingOutput {
  policyId: number;
  controlMappings: ControlMappingResult[];
}

// ============================================================================
// Database Mapping Types
// ============================================================================

export interface ControlPolicyMappingCreate {
  controlId: string; // NIST control ID (e.g., "03.05.07")
  policyId: number; // Database ID of M365Policy
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes: string;
  mappedSettings: MappedSetting[]; // Will be JSON-stringified
  isAutoMapped: boolean;
}

// ============================================================================
// Confidence Scoring Types
// ============================================================================

export interface ConfidenceScore {
  score: number; // 0-100
  level: 'High' | 'Medium' | 'Low';
  settingsMatched: number;
  settingsTotal: number;
  settingsCompliant: number;
}

// ============================================================================
// Sync Statistics Types
// ============================================================================

export interface SettingsMappingStats {
  totalPolicies: number;
  totalMappingsCreated: number;
  mappingsByConfidence: {
    High: number;
    Medium: number;
    Low: number;
  };
  controlsCovered: number;
  settingsMatched: number;
  duration: number; // milliseconds
}

// ============================================================================
// Gap Analysis Types
// ============================================================================

export interface ControlGap {
  controlId: string;
  controlTitle: string;
  family: string;
  gapType: 'NoSettings' | 'NonCompliantSettings' | 'PartialCompliance';
  affectedPolicies: {
    policyId: number;
    policyName: string;
    nonCompliantSettings: MappedSetting[];
  }[];
  recommendedActions: string[];
}

export interface GapAnalysisResult {
  totalControls: number;
  controlsFullyCovered: number;
  controlsPartiallyCovered: number;
  controlsNotCovered: number;
  gaps: ControlGap[];
  coveragePercentage: number; // 0-100
}
