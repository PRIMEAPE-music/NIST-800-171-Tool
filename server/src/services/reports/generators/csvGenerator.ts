import * as fs from 'fs';
import * as path from 'path';
import { format as formatCSV } from '@fast-csv/format';
import {
  ReportType,
  ExecutiveSummaryData,
  DetailedComplianceData,
  GapAnalysisData,
  POAMReportData,
  AuditPackageData,
  ProgressReportData,
} from '../../../types/reports';

const REPORTS_DIR = path.join(__dirname, '../../../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate Executive Summary CSV
 */
export async function generateExecutiveSummaryCSV(
  data: ExecutiveSummaryData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const stream = formatCSV({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  stream.pipe(writeStream);

  // Overview section
  stream.write({ Section: 'Overall Compliance', Metric: 'Total Controls', Value: data.overview.totalControls });
  stream.write({ Section: 'Overall Compliance', Metric: 'Implemented', Value: data.overview.implementedControls });
  stream.write({ Section: 'Overall Compliance', Metric: 'Percentage', Value: `${data.overview.compliancePercentage}%` });
  stream.write({ Section: 'Overall Compliance', Metric: 'Assessed Controls', Value: data.overview.assessedControls });

  stream.write({ Section: '', Metric: '', Value: '' }); // Empty row

  // Family breakdown
  data.familyBreakdown.forEach((family) => {
    stream.write({
      Section: 'Family Compliance',
      Metric: `${family.family} - ${family.familyName}`,
      Value: `${family.implementedControls}/${family.totalControls} (${family.compliancePercentage}%)`,
    });
  });

  stream.write({ Section: '', Metric: '', Value: '' }); // Empty row

  // Critical gaps
  stream.write({ Section: 'Critical Gaps', Metric: 'Control ID', Value: 'Risk Score', Extra: 'Status' });
  data.criticalGaps.forEach((gap) => {
    stream.write({
      Section: 'Critical Gaps',
      Metric: gap.controlId,
      Value: gap.riskScore,
      Extra: gap.status,
    });
  });

  stream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

/**
 * Generate Detailed Compliance CSV
 */
export async function generateDetailedComplianceCSV(
  data: DetailedComplianceData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const stream = formatCSV({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  stream.pipe(writeStream);

  // Write headers and data
  data.controls.forEach((control) => {
    stream.write({
      'Control ID': control.controlId,
      Family: control.family,
      Title: control.title,
      Status: control.status,
      'Implementation Date': control.implementationDate || 'N/A',
      'Has Evidence': control.hasEvidence ? 'Yes' : 'No',
      'Evidence Count': control.evidenceCount,
      'Risk Score': control.riskScore || 'N/A',
      'Assigned To': control.assignedTo || 'Not assigned',
      'Last Reviewed': control.lastReviewed || 'N/A',
      'Next Review': control.nextReview || 'N/A',
      Notes: control.notes || '',
    });
  });

  stream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

/**
 * Generate Gap Analysis CSV
 */
export async function generateGapAnalysisCSV(
  data: GapAnalysisData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const stream = formatCSV({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  stream.pipe(writeStream);

  data.gaps.forEach((gap) => {
    stream.write({
      'Control ID': gap.controlId,
      Family: gap.family,
      Title: gap.title,
      'Risk Score': gap.riskScore,
      'Risk Level': gap.riskLevel,
      Status: gap.status,
      'Gap Description': gap.gapDescription,
      'Remediation Recommendation': gap.remediationRecommendation,
      'Estimated Effort': gap.estimatedEffort,
      Priority: gap.priority,
    });
  });

  stream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

/**
 * Generate POAM CSV
 */
export async function generatePOAMCSV(
  data: POAMReportData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const stream = formatCSV({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  stream.pipe(writeStream);

  data.poams.forEach((poam) => {
    stream.write({
      'POAM ID': poam.id,
      'Control ID': poam.controlId,
      'Control Title': poam.controlTitle,
      'Gap Description': poam.gapDescription,
      'Remediation Plan': poam.remediationPlan,
      Status: poam.status,
      Priority: poam.priority,
      'Assigned Owner': poam.assignedOwner || 'Not assigned',
      'Start Date': poam.startDate || 'N/A',
      'Target Date': poam.targetDate || 'N/A',
      'Completion Date': poam.completionDate || 'N/A',
      'Budget Estimate': poam.budgetEstimate ? `$${poam.budgetEstimate}` : 'N/A',
      'Milestones Completed': `${poam.milestonesCompleted}/${poam.milestonesTotalCount}`,
      'Is Overdue': poam.isOverdue ? 'Yes' : 'No',
      'Days Until Due': poam.daysUntilDue !== null ? poam.daysUntilDue : 'N/A',
    });
  });

  stream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

/**
 * Generate Audit Package CSV (multiple CSV files in a zip would be better, but for now, one large CSV)
 */
export async function generateAuditPackageCSV(
  data: AuditPackageData,
  fileName: string
): Promise<string> {
  // For simplicity, we'll just use the detailed compliance CSV
  // In a real implementation, you'd want to create multiple CSV files and zip them
  return generateDetailedComplianceCSV(data.detailedCompliance, fileName);
}

/**
 * Generate Progress Report CSV
 */
export async function generateProgressReportCSV(
  data: ProgressReportData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const stream = formatCSV({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  stream.pipe(writeStream);

  // Current snapshot
  stream.write({
    Section: 'Current Snapshot',
    Metric: 'Date',
    Value: new Date(data.currentSnapshot.date).toLocaleDateString(),
  });
  stream.write({
    Section: 'Current Snapshot',
    Metric: 'Compliance Percentage',
    Value: `${data.currentSnapshot.compliancePercentage}%`,
  });
  stream.write({
    Section: 'Current Snapshot',
    Metric: 'Implemented Controls',
    Value: data.currentSnapshot.implementedControls,
  });

  stream.write({ Section: '', Metric: '', Value: '' }); // Empty row

  // Recently completed
  stream.write({ Section: 'Recently Completed', Metric: 'Control ID', Value: 'Title' });
  data.recentlyCompleted.forEach((item) => {
    stream.write({
      Section: 'Recently Completed',
      Metric: item.controlId,
      Value: item.title,
    });
  });

  stream.write({ Section: '', Metric: '', Value: '' }); // Empty row

  // In progress
  stream.write({ Section: 'In Progress', Metric: 'Control ID', Value: 'Title' });
  data.inProgress.forEach((item) => {
    stream.write({
      Section: 'In Progress',
      Metric: item.controlId,
      Value: item.title,
    });
  });

  stream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}

/**
 * Main CSV generation dispatcher
 */
export async function generateCSV(
  reportType: ReportType,
  data: any,
  fileName: string
): Promise<string> {
  switch (reportType) {
    case 'executive-summary':
      return generateExecutiveSummaryCSV(data, fileName);
    case 'detailed-compliance':
      return generateDetailedComplianceCSV(data, fileName);
    case 'gap-analysis':
      return generateGapAnalysisCSV(data, fileName);
    case 'poam':
      return generatePOAMCSV(data, fileName);
    case 'audit-package':
      return generateAuditPackageCSV(data, fileName);
    case 'progress':
      return generateProgressReportCSV(data, fileName);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}
