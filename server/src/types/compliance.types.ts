// Compliance status types
export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  NOT_CONFIGURED = 'NOT_CONFIGURED'
}

// Platform types
export enum DevicePlatform {
  WINDOWS = 'Windows',
  IOS = 'iOS',
  ANDROID = 'Android',
  MACOS = 'macOS',
  ALL = 'All'
}

// Setting compliance result
export interface SettingComplianceResult {
  settingId: number;
  settingName: string;
  policyType: string;
  isCompliant: boolean;
  status: ComplianceStatus;
  expectedValue: string;
  actualValue: string | null;
  validationOperator: string;
  confidence: string;
  platform: string;
  lastChecked: Date;
  complianceMessage?: string;
}

// Control compliance summary
export interface ControlComplianceSummary {
  controlId: number;
  controlNumber: string;
  totalRequiredSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  compliancePercentage: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  windowsCoverage: number;
  iosCoverage: number;
  androidCoverage: number;
  lastCalculated: Date;
}

// Confidence weights
export interface ConfidenceWeights {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

// Bulk calculation result
export interface BulkCalculationResult {
  totalControls: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    controlId: string;
    error: string;
  }>;
  duration: number;
}
