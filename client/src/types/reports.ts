export type ReportType =
  | 'executive-summary'
  | 'detailed-compliance'
  | 'gap-analysis'
  | 'poam'
  | 'audit-package'
  | 'progress';

export type ReportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportTypeInfo {
  value: ReportType;
  label: string;
  description: string;
  formats: ReportFormat[];
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

export interface ReportOptions {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  includeCharts?: boolean;
  includeEvidence?: boolean;
  customTitle?: string;
}

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
  status: string;
}

export interface ReportGenerationResult {
  success: boolean;
  reportId?: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}
