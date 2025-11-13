// Microsoft Compliance Manager Types

/**
 * Compliance Assessment from Microsoft Graph API
 * API: GET /compliance/manager/assessments or /security/compliance/assessments
 */
export interface ComplianceAssessment {
  id: string;
  displayName: string;
  description?: string;
  creationDateTime: string;
  lastModifiedDateTime: string;
  assessmentTemplateId?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  score?: {
    current: number;
    max: number;
    percentage: number;
  };
}

/**
 * Compliance Score Summary
 */
export interface ComplianceScoreSummary {
  totalScore: number;           // Total compliance score achieved
  maxScore: number;             // Maximum possible score
  percentage: number;           // Percentage of compliance
  yourPoints: number;           // Points from actions you control
  yourMaxPoints: number;        // Max points you can achieve
  microsoftPoints: number;      // Points from Microsoft-managed actions
  microsoftMaxPoints: number;   // Max Microsoft-managed points
  assessmentId: string;
  assessmentName: string;       // e.g., "NIST 800-171 Rev 2"
  lastUpdated: string;
  controlsCount?: number;
  actionsCount?: number;
}

/**
 * Compliance Improvement Action
 */
export interface ComplianceImprovementAction {
  id: string;
  title: string;
  description?: string;
  category: string;             // e.g., "Identity", "Data", "Device"
  status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' | 'Unknown';
  points: number;               // Impact on compliance score
  maxPoints?: number;
  implementationCost?: 'Low' | 'Moderate' | 'High';
  userImpact?: 'Low' | 'Moderate' | 'High';
  implementationUrl?: string;
  controlMappings?: string[];   // NIST control IDs this maps to
  dueDate?: string;
  assignedTo?: string;
  completedDate?: string;
  lastModifiedDate?: string;
  implementationStatus?: string;
  testStatus?: string;
  evidence?: {
    required: boolean;
    uploaded: boolean;
    fileCount?: number;
  };
  isManaged?: boolean;          // Microsoft-managed vs. Customer-managed
}

/**
 * Compliance Control Mapping
 */
export interface ComplianceControlMapping {
  complianceControlId: string;
  nistControlId: string;        // e.g., "03.01.01"
  title: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
}

/**
 * Enriched Compliance Recommendation
 * Combines static recommendations with live Compliance Manager data
 */
export interface EnrichedComplianceRecommendation {
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  description?: string;
  // Live data from Compliance Manager
  status?: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' | 'Unknown';
  points?: number;
  maxPoints?: number;
  implementationCost?: string;
  userImpact?: string;
  implementationUrl?: string;
  lastUpdated?: string;
  completedDate?: string;
  assignedTo?: string;
  dueDate?: string;
  evidenceRequired?: boolean;
  evidenceUploaded?: boolean;
  isManaged?: boolean;
}

/**
 * Compliance Assessment Template
 */
export interface ComplianceAssessmentTemplate {
  id: string;
  displayName: string;
  description?: string;
  productFamily: string;        // e.g., "NIST", "GDPR", "ISO"
  certification?: string;
}

/**
 * Response from enriching recommendations with Compliance Manager data
 */
export interface EnrichComplianceRecommendationsResponse {
  controlId: string;
  recommendations: EnrichedComplianceRecommendation[];
  complianceScore?: {
    totalScore: number;
    maxScore: number;
    percentage: number;
  };
  lastSynced: string;
}

/**
 * Compliance Manager sync result
 */
export interface ComplianceSyncResult {
  success: boolean;
  assessmentsFound: number;
  nistAssessmentFound: boolean;
  improvementActionsCount: number;
  lastSyncTime: string;
  errors?: string[];
}
