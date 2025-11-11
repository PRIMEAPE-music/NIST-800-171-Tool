// Report Types
export type ReportType =
  | 'executive-summary'
  | 'detailed-compliance'
  | 'gap-analysis'
  | 'poam'
  | 'audit-package'
  | 'progress';

export type ReportFormat = 'csv' | 'excel' | 'pdf';

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

// Report Options
export interface ReportOptions {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  includeCharts?: boolean;
  includeEvidence?: boolean;
  customTitle?: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  families?: string[];
  statuses?: string[];
  priorities?: string[];
  hasEvidence?: boolean;
  assignedTo?: string;
  riskScoreMin?: number;
  riskScoreMax?: number;
  poamStatuses?: string[];
  overdueOnly?: boolean;
}

// Report Data Structures
export interface ExecutiveSummaryData {
  overview: {
    totalControls: number;
    implementedControls: number;
    compliancePercentage: number;
    assessedControls: number;
    lastAssessmentDate: string | null;
  };
  familyBreakdown: FamilyBreakdownItem[];
  criticalGaps: GapItem[];
  recentProgress: ProgressItem[];
  riskSummary: RiskSummaryItem[];
}

export interface FamilyBreakdownItem {
  family: string;
  familyName: string;
  totalControls: number;
  implementedControls: number;
  compliancePercentage: number;
}

export interface GapItem {
  controlId: string;
  family: string;
  title: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  gapDescription: string;
  priority: string;
}

export interface ProgressItem {
  controlId: string;
  title: string;
  action: string;
  date: string;
  assignedTo: string | null;
}

export interface RiskSummaryItem {
  riskLevel: string;
  count: number;
  percentage: number;
}

export interface DetailedComplianceData {
  controls: DetailedControlItem[];
  summary: {
    totalControls: number;
    byStatus: Record<string, number>;
    byFamily: Record<string, number>;
    evidenceCoverage: number;
  };
}

export interface DetailedControlItem {
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  status: string;
  implementationDate: string | null;
  lastReviewed: string | null;
  nextReview: string | null;
  hasEvidence: boolean;
  evidenceCount: number;
  riskScore: number | null;
  assignedTo: string | null;
  notes: string | null;
}

export interface GapAnalysisData {
  gaps: GapAnalysisItem[];
  statistics: {
    totalGaps: number;
    criticalGaps: number;
    highRiskGaps: number;
    averageRiskScore: number;
  };
  riskMatrix: RiskMatrixData;
}

export interface GapAnalysisItem {
  controlId: string;
  family: string;
  title: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  impact: number;
  likelihood: number;
  gapDescription: string;
  remediationRecommendation: string;
  estimatedEffort: string;
  priority: string;
}

export interface RiskMatrixData {
  high: number;
  medium: number;
  low: number;
  byFamily: Record<string, { high: number; medium: number; low: number }>;
}

export interface POAMReportData {
  poams: POAMReportItem[];
  statistics: {
    totalPoams: number;
    openPoams: number;
    inProgressPoams: number;
    completedPoams: number;
    overduePoams: number;
    averageCompletion: number;
  };
}

export interface POAMReportItem {
  id: number;
  controlId: string;
  controlTitle: string;
  gapDescription: string;
  remediationPlan: string;
  status: string;
  priority: string;
  assignedOwner: string | null;
  startDate: string | null;
  targetDate: string | null;
  completionDate: string | null;
  budgetEstimate: number | null;
  resourcesRequired: string | null;
  milestones: MilestoneItem[];
  milestonesCompleted: number;
  milestonesTotalCount: number;
  isOverdue: boolean;
  daysUntilDue: number | null;
}

export interface MilestoneItem {
  id: number;
  description: string;
  targetDate: string;
  completionDate: string | null;
  status: string;
}

export interface AuditPackageData {
  executiveSummary: ExecutiveSummaryData;
  detailedCompliance: DetailedComplianceData;
  gapAnalysis: GapAnalysisData;
  poamReport: POAMReportData;
  evidenceSummary: EvidenceSummaryData;
  m365Integration?: M365IntegrationData;
}

export interface EvidenceSummaryData {
  totalEvidence: number;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
  evidenceByFamily: Record<string, number>;
}

export interface M365IntegrationData {
  lastSyncDate: string | null;
  policiesMapped: number;
  complianceChecksEnabled: boolean;
}

export interface ProgressReportData {
  currentSnapshot: {
    date: string;
    compliancePercentage: number;
    implementedControls: number;
  };
  previousSnapshot: {
    date: string;
    compliancePercentage: number;
    implementedControls: number;
  } | null;
  improvement: {
    percentageChange: number;
    controlsImproved: number;
  };
  recentlyCompleted: ProgressItem[];
  inProgress: ProgressItem[];
  upcomingMilestones: MilestoneItem[];
}

// Report History
export interface ReportHistoryItem {
  id: number;
  reportType: ReportType;
  reportName: string;
  format: ReportFormat;
  filePath: string | null;
  fileSize: number | null;
  filters: string | null;
  generatedAt: string;
  generatedBy: string | null;
  status: ReportStatus;
}

// Report Generation Result
export interface ReportGenerationResult {
  success: boolean;
  reportId?: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

// Report Template
export interface ReportTemplate {
  id: number;
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  filters: ReportFilters;
  description?: string;
  createdAt: string;
}
