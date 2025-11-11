# Phase 7.1: Backend Foundation & CSV Reports

## Overview
Build the server-side foundation for report generation, including data aggregation services, API endpoints, and CSV export functionality for all report types.

**Duration**: 1-2 days
**Prerequisite**: Phases 1-6 completed

---

## Step 1: Install Dependencies

### Backend Dependencies
```bash
cd server
npm install fast-csv exceljs pdfkit pdfkit-table canvas
npm install -D @types/pdfkit
```

### Create Reports Directory
```bash
mkdir -p server/reports
mkdir -p server/src/services/reports
mkdir -p server/src/services/reports/generators
mkdir -p server/src/controllers
```

---

## Step 2: Create TypeScript Interfaces

📁 **File**: `server/src/types/reports.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
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
```

---

## Step 3: Create Data Aggregator Service

📁 **File**: `server/src/services/reports/dataAggregator.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import { PrismaClient } from '@prisma/client';
import {
  ReportFilters,
  ExecutiveSummaryData,
  DetailedComplianceData,
  GapAnalysisData,
  POAMReportData,
  AuditPackageData,
  ProgressReportData,
  FamilyBreakdownItem,
  GapItem,
  DetailedControlItem,
  GapAnalysisItem,
  POAMReportItem,
  ProgressItem,
  RiskSummaryItem,
  EvidenceSummaryData,
} from '../../types/reports';

const prisma = new PrismaClient();

// Helper: Calculate risk level from score
function getRiskLevel(riskScore: number): string {
  if (riskScore >= 8) return 'Critical';
  if (riskScore >= 6) return 'High';
  if (riskScore >= 4) return 'Medium';
  return 'Low';
}

// Helper: Calculate days until date
function daysUntilDate(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Apply filters to Prisma query
function buildFilterQuery(filters?: ReportFilters): any {
  if (!filters) return {};

  const where: any = {};

  if (filters.families && filters.families.length > 0) {
    where.family = { in: filters.families };
  }

  if (filters.statuses && filters.statuses.length > 0) {
    where.controlStatus = {
      status: { in: filters.statuses },
    };
  }

  if (filters.priorities && filters.priorities.length > 0) {
    where.priority = { in: filters.priorities };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.controlStatus = where.controlStatus || {};
    where.controlStatus.implementationDate = {};

    if (filters.dateFrom) {
      where.controlStatus.implementationDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.controlStatus.implementationDate.lte = new Date(filters.dateTo);
    }
  }

  if (filters.assignedTo) {
    where.controlStatus = where.controlStatus || {};
    where.controlStatus.assignedTo = filters.assignedTo;
  }

  return where;
}

/**
 * Aggregate data for Executive Summary Report
 */
export async function aggregateExecutiveSummaryData(
  filters?: ReportFilters
): Promise<ExecutiveSummaryData> {
  // Get all controls with status and assessments
  const controls = await prisma.control.findMany({
    where: buildFilterQuery(filters),
    include: {
      controlStatus: true,
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 1,
      },
    },
  });

  const totalControls = controls.length;
  const implementedControls = controls.filter(
    (c) =>
      c.controlStatus?.status === 'Implemented' ||
      c.controlStatus?.status === 'Verified'
  ).length;
  const compliancePercentage =
    totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

  const assessedControls = controls.filter((c) => c.assessments.length > 0).length;

  const lastAssessment = controls
    .flatMap((c) => c.assessments)
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0];

  // Family breakdown
  const familyMap = new Map<string, { total: number; implemented: number }>();
  controls.forEach((control) => {
    const family = control.family;
    if (!familyMap.has(family)) {
      familyMap.set(family, { total: 0, implemented: 0 });
    }
    const familyData = familyMap.get(family)!;
    familyData.total++;
    if (
      control.controlStatus?.status === 'Implemented' ||
      control.controlStatus?.status === 'Verified'
    ) {
      familyData.implemented++;
    }
  });

  const familyBreakdown: FamilyBreakdownItem[] = Array.from(familyMap.entries())
    .map(([family, data]) => ({
      family,
      familyName: getFamilyName(family),
      totalControls: data.total,
      implementedControls: data.implemented,
      compliancePercentage:
        data.total > 0 ? Math.round((data.implemented / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.family.localeCompare(b.family));

  // Critical gaps (top 10 by risk score)
  const criticalGaps: GapItem[] = controls
    .filter((c) => {
      const status = c.controlStatus?.status;
      return status !== 'Implemented' && status !== 'Verified';
    })
    .map((c) => {
      const assessment = c.assessments[0];
      const riskScore = assessment?.riskScore || 0;
      return {
        controlId: c.controlId,
        family: c.family,
        title: c.title,
        status: c.controlStatus?.status || 'Not Started',
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        gapDescription: assessment?.assessorNotes || 'No assessment available',
        priority: c.priority || 'Medium',
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  // Recent progress (last 10 status changes)
  const recentStatusChanges = await prisma.controlStatus.findMany({
    where: filters ? buildFilterQuery(filters) : {},
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      control: true,
    },
  });

  const recentProgress: ProgressItem[] = recentStatusChanges.map((cs) => ({
    controlId: cs.control.controlId,
    title: cs.control.title,
    action: `Status changed to ${cs.status}`,
    date: cs.updatedAt.toISOString(),
    assignedTo: cs.assignedTo,
  }));

  // Risk summary
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  criticalGaps.forEach((gap) => {
    riskCounts[gap.riskLevel as keyof typeof riskCounts]++;
  });

  const totalRisks = Object.values(riskCounts).reduce((sum, count) => sum + count, 0);
  const riskSummary: RiskSummaryItem[] = Object.entries(riskCounts).map(
    ([level, count]) => ({
      riskLevel: level,
      count,
      percentage: totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0,
    })
  );

  return {
    overview: {
      totalControls,
      implementedControls,
      compliancePercentage,
      assessedControls,
      lastAssessmentDate: lastAssessment?.assessmentDate.toISOString() || null,
    },
    familyBreakdown,
    criticalGaps,
    recentProgress,
    riskSummary,
  };
}

/**
 * Aggregate data for Detailed Compliance Report
 */
export async function aggregateDetailedComplianceData(
  filters?: ReportFilters
): Promise<DetailedComplianceData> {
  const controls = await prisma.control.findMany({
    where: buildFilterQuery(filters),
    include: {
      controlStatus: true,
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 1,
      },
      evidence: true,
    },
    orderBy: { controlId: 'asc' },
  });

  const detailedControls: DetailedControlItem[] = controls.map((c) => {
    const status = c.controlStatus;
    const assessment = c.assessments[0];

    return {
      controlId: c.controlId,
      family: c.family,
      title: c.title,
      requirementText: c.requirementText,
      status: status?.status || 'Not Started',
      implementationDate: status?.implementationDate?.toISOString() || null,
      lastReviewed: status?.lastReviewedDate?.toISOString() || null,
      nextReview: status?.nextReviewDate?.toISOString() || null,
      hasEvidence: c.evidence.length > 0,
      evidenceCount: c.evidence.length,
      riskScore: assessment?.riskScore || null,
      assignedTo: status?.assignedTo || null,
      notes: status?.implementationNotes || null,
    };
  });

  // Summary statistics
  const byStatus: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  let controlsWithEvidence = 0;

  detailedControls.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byFamily[c.family] = (byFamily[c.family] || 0) + 1;
    if (c.hasEvidence) controlsWithEvidence++;
  });

  const evidenceCoverage =
    detailedControls.length > 0
      ? Math.round((controlsWithEvidence / detailedControls.length) * 100)
      : 0;

  return {
    controls: detailedControls,
    summary: {
      totalControls: detailedControls.length,
      byStatus,
      byFamily,
      evidenceCoverage,
    },
  };
}

/**
 * Aggregate data for Gap Analysis Report
 */
export async function aggregateGapAnalysisData(
  filters?: ReportFilters
): Promise<GapAnalysisData> {
  const where = buildFilterQuery(filters);

  // Add additional filter for non-compliant controls
  where.controlStatus = where.controlStatus || {};
  where.controlStatus.status = {
    notIn: ['Implemented', 'Verified'],
  };

  // Apply risk score filter if provided
  if (filters?.riskScoreMin !== undefined || filters?.riskScoreMax !== undefined) {
    where.assessments = {
      some: {
        riskScore:
          filters.riskScoreMin !== undefined && filters.riskScoreMax !== undefined
            ? { gte: filters.riskScoreMin, lte: filters.riskScoreMax }
            : filters.riskScoreMin !== undefined
            ? { gte: filters.riskScoreMin }
            : { lte: filters.riskScoreMax! },
      },
    };
  }

  const gapControls = await prisma.control.findMany({
    where,
    include: {
      controlStatus: true,
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 1,
      },
    },
  });

  const gaps: GapAnalysisItem[] = gapControls
    .map((c) => {
      const assessment = c.assessments[0];
      const riskScore = assessment?.riskScore || 5;

      return {
        controlId: c.controlId,
        family: c.family,
        title: c.title,
        status: c.controlStatus?.status || 'Not Started',
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        impact: Math.ceil(riskScore / 2), // Simplified: derive from risk score
        likelihood: Math.floor(riskScore / 2), // Simplified: derive from risk score
        gapDescription:
          assessment?.assessorNotes || `${c.title} is not fully implemented`,
        remediationRecommendation: `Implement ${c.title} according to NIST 800-171 Rev 3 requirements`,
        estimatedEffort: riskScore >= 7 ? 'High' : riskScore >= 4 ? 'Medium' : 'Low',
        priority: c.priority || 'Medium',
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // Calculate statistics
  const totalGaps = gaps.length;
  const criticalGaps = gaps.filter((g) => g.riskLevel === 'Critical').length;
  const highRiskGaps = gaps.filter((g) => g.riskLevel === 'High').length;
  const averageRiskScore =
    totalGaps > 0
      ? Math.round(gaps.reduce((sum, g) => sum + g.riskScore, 0) / totalGaps)
      : 0;

  // Risk matrix
  const riskMatrix = {
    high: gaps.filter((g) => g.riskLevel === 'Critical' || g.riskLevel === 'High').length,
    medium: gaps.filter((g) => g.riskLevel === 'Medium').length,
    low: gaps.filter((g) => g.riskLevel === 'Low').length,
    byFamily: {} as Record<string, { high: number; medium: number; low: number }>,
  };

  gaps.forEach((gap) => {
    if (!riskMatrix.byFamily[gap.family]) {
      riskMatrix.byFamily[gap.family] = { high: 0, medium: 0, low: 0 };
    }
    if (gap.riskLevel === 'Critical' || gap.riskLevel === 'High') {
      riskMatrix.byFamily[gap.family].high++;
    } else if (gap.riskLevel === 'Medium') {
      riskMatrix.byFamily[gap.family].medium++;
    } else {
      riskMatrix.byFamily[gap.family].low++;
    }
  });

  return {
    gaps,
    statistics: {
      totalGaps,
      criticalGaps,
      highRiskGaps,
      averageRiskScore,
    },
    riskMatrix,
  };
}

/**
 * Aggregate data for POAM Report
 */
export async function aggregatePOAMReportData(
  filters?: ReportFilters
): Promise<POAMReportData> {
  const where: any = {};

  if (filters?.poamStatuses && filters.poamStatuses.length > 0) {
    where.status = { in: filters.poamStatuses };
  }

  if (filters?.overdueOnly) {
    where.targetCompletionDate = { lt: new Date() };
    where.completionDate = null;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.targetCompletionDate = {};
    if (filters.dateFrom) {
      where.targetCompletionDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.targetCompletionDate.lte = new Date(filters.dateTo);
    }
  }

  const poams = await prisma.poam.findMany({
    where,
    include: {
      control: true,
      milestones: {
        orderBy: { targetDate: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const poamItems: POAMReportItem[] = poams.map((p) => {
    const milestonesCompleted = p.milestones.filter((m) => m.status === 'Completed').length;
    const milestonesTotalCount = p.milestones.length;
    const isOverdue =
      p.targetCompletionDate && !p.completionDate
        ? new Date(p.targetCompletionDate) < new Date()
        : false;
    const daysUntil = daysUntilDate(p.targetCompletionDate?.toISOString() || null);

    return {
      id: p.id,
      controlId: p.control.controlId,
      controlTitle: p.control.title,
      gapDescription: p.gapDescription,
      remediationPlan: p.remediationPlan,
      status: p.status,
      priority: p.priority,
      assignedOwner: p.assignedOwner,
      startDate: p.startDate?.toISOString() || null,
      targetDate: p.targetCompletionDate?.toISOString() || null,
      completionDate: p.completionDate?.toISOString() || null,
      budgetEstimate: p.budgetEstimate,
      resourcesRequired: p.resourcesRequired,
      milestones: p.milestones.map((m) => ({
        id: m.id,
        description: m.description,
        targetDate: m.targetDate.toISOString(),
        completionDate: m.completionDate?.toISOString() || null,
        status: m.status,
      })),
      milestonesCompleted,
      milestonesTotalCount,
      isOverdue,
      daysUntilDue: daysUntil,
    };
  });

  // Statistics
  const totalPoams = poamItems.length;
  const openPoams = poamItems.filter((p) => p.status === 'Open').length;
  const inProgressPoams = poamItems.filter((p) => p.status === 'In Progress').length;
  const completedPoams = poamItems.filter((p) => p.status === 'Completed').length;
  const overduePoams = poamItems.filter((p) => p.isOverdue).length;

  const totalMilestones = poamItems.reduce((sum, p) => sum + p.milestonesTotalCount, 0);
  const completedMilestones = poamItems.reduce((sum, p) => sum + p.milestonesCompleted, 0);
  const averageCompletion =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    poams: poamItems,
    statistics: {
      totalPoams,
      openPoams,
      inProgressPoams,
      completedPoams,
      overduePoams,
      averageCompletion,
    },
  };
}

/**
 * Aggregate data for Audit Package Report
 */
export async function aggregateAuditPackageData(
  filters?: ReportFilters
): Promise<AuditPackageData> {
  const [
    executiveSummary,
    detailedCompliance,
    gapAnalysis,
    poamReport,
  ] = await Promise.all([
    aggregateExecutiveSummaryData(filters),
    aggregateDetailedComplianceData(filters),
    aggregateGapAnalysisData(filters),
    aggregatePOAMReportData(filters),
  ]);

  // Evidence summary
  const allEvidence = await prisma.evidence.findMany({
    include: { control: true },
  });

  const controlsWithEvidence = new Set(allEvidence.map((e) => e.controlId)).size;
  const totalControls = detailedCompliance.controls.length;

  const evidenceByFamily: Record<string, number> = {};
  allEvidence.forEach((e) => {
    const family = e.control.family;
    evidenceByFamily[family] = (evidenceByFamily[family] || 0) + 1;
  });

  const evidenceSummary: EvidenceSummaryData = {
    totalEvidence: allEvidence.length,
    controlsWithEvidence,
    controlsWithoutEvidence: totalControls - controlsWithEvidence,
    evidenceByFamily,
  };

  return {
    executiveSummary,
    detailedCompliance,
    gapAnalysis,
    poamReport,
    evidenceSummary,
  };
}

/**
 * Aggregate data for Progress Report
 */
export async function aggregateProgressReportData(
  filters?: ReportFilters
): Promise<ProgressReportData> {
  // Current snapshot
  const currentControls = await prisma.control.findMany({
    include: {
      controlStatus: true,
    },
  });

  const currentImplemented = currentControls.filter(
    (c) =>
      c.controlStatus?.status === 'Implemented' ||
      c.controlStatus?.status === 'Verified'
  ).length;

  const currentPercentage = Math.round((currentImplemented / currentControls.length) * 100);

  // Previous snapshot (30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // This is simplified - in reality, you'd need to track historical snapshots
  // For now, we'll just show current vs. null
  const previousSnapshot = null;

  const improvement = {
    percentageChange: 0,
    controlsImproved: 0,
  };

  // Recently completed (last 30 days)
  const recentlyCompleted = await prisma.controlStatus.findMany({
    where: {
      status: { in: ['Implemented', 'Verified'] },
      implementationDate: { gte: thirtyDaysAgo },
    },
    include: { control: true },
    orderBy: { implementationDate: 'desc' },
    take: 10,
  });

  const recentlyCompletedItems: ProgressItem[] = recentlyCompleted.map((cs) => ({
    controlId: cs.control.controlId,
    title: cs.control.title,
    action: `Implemented on ${cs.implementationDate?.toLocaleDateString() || 'N/A'}`,
    date: cs.implementationDate?.toISOString() || '',
    assignedTo: cs.assignedTo,
  }));

  // In progress
  const inProgressControls = await prisma.controlStatus.findMany({
    where: { status: 'In Progress' },
    include: { control: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const inProgressItems: ProgressItem[] = inProgressControls.map((cs) => ({
    controlId: cs.control.controlId,
    title: cs.control.title,
    action: 'In Progress',
    date: cs.updatedAt.toISOString(),
    assignedTo: cs.assignedTo,
  }));

  // Upcoming milestones
  const upcomingMilestones = await prisma.milestone.findMany({
    where: {
      status: { not: 'Completed' },
      targetDate: { gte: new Date() },
    },
    orderBy: { targetDate: 'asc' },
    take: 10,
  });

  return {
    currentSnapshot: {
      date: new Date().toISOString(),
      compliancePercentage: currentPercentage,
      implementedControls: currentImplemented,
    },
    previousSnapshot,
    improvement,
    recentlyCompleted: recentlyCompletedItems,
    inProgress: inProgressItems,
    upcomingMilestones: upcomingMilestones.map((m) => ({
      id: m.id,
      description: m.description,
      targetDate: m.targetDate.toISOString(),
      completionDate: m.completionDate?.toISOString() || null,
      status: m.status,
    })),
  };
}

// Helper function: Get family full name
function getFamilyName(familyCode: string): string {
  const familyNames: Record<string, string> = {
    AC: 'Access Control',
    AT: 'Awareness and Training',
    AU: 'Audit and Accountability',
    CA: 'Assessment, Authorization, and Monitoring',
    CM: 'Configuration Management',
    CP: 'Contingency Planning',
    IA: 'Identification and Authentication',
    IR: 'Incident Response',
    MA: 'Maintenance',
    MP: 'Media Protection',
    PE: 'Physical Protection',
    PS: 'Personnel Security',
    RA: 'Risk Assessment',
    SC: 'System and Communications Protection',
    SI: 'System and Information Integrity',
  };
  return familyNames[familyCode] || familyCode;
}
```

---

## Step 4: Create CSV Generator

📁 **File**: `server/src/services/reports/generators/csvGenerator.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
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
} from '../../types/reports';

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
```

---

## Step 5: Create Main Report Service

📁 **File**: `server/src/services/reports/reportService.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import {
  ReportType,
  ReportFormat,
  ReportOptions,
  ReportGenerationResult,
} from '../../types/reports';
import {
  aggregateExecutiveSummaryData,
  aggregateDetailedComplianceData,
  aggregateGapAnalysisData,
  aggregatePOAMReportData,
  aggregateAuditPackageData,
  aggregateProgressReportData,
} from './dataAggregator';
import { generateCSV } from './generators/csvGenerator';

const prisma = new PrismaClient();

/**
 * Generate a report based on options
 */
export async function generateReport(
  options: ReportOptions
): Promise<ReportGenerationResult> {
  try {
    // Step 1: Aggregate data based on report type
    const data = await aggregateReportData(options.reportType, options.filters);

    // Step 2: Generate file based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportName = options.customTitle || getDefaultReportName(options.reportType);
    const fileName = `${reportName}_${timestamp}.${options.format}`;

    let filePath: string;

    switch (options.format) {
      case 'csv':
        filePath = await generateCSV(options.reportType, data, fileName);
        break;
      case 'excel':
        throw new Error('Excel generation not yet implemented (Phase 7.2)');
      case 'pdf':
        throw new Error('PDF generation not yet implemented (Phase 7.3)');
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Step 3: Save report to history
    const fileStats = fs.statSync(filePath);
    const reportRecord = await prisma.reportHistory.create({
      data: {
        reportType: options.reportType,
        reportName,
        format: options.format,
        filePath,
        fileSize: fileStats.size,
        filters: options.filters ? JSON.stringify(options.filters) : null,
        status: 'completed',
      },
    });

    return {
      success: true,
      reportId: reportRecord.id,
      filePath: path.basename(filePath),
      fileName,
      fileSize: fileStats.size,
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Aggregate data based on report type
 */
async function aggregateReportData(reportType: ReportType, filters?: any): Promise<any> {
  switch (reportType) {
    case 'executive-summary':
      return await aggregateExecutiveSummaryData(filters);
    case 'detailed-compliance':
      return await aggregateDetailedComplianceData(filters);
    case 'gap-analysis':
      return await aggregateGapAnalysisData(filters);
    case 'poam':
      return await aggregatePOAMReportData(filters);
    case 'audit-package':
      return await aggregateAuditPackageData(filters);
    case 'progress':
      return await aggregateProgressReportData(filters);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Get default report name
 */
function getDefaultReportName(reportType: ReportType): string {
  const names: Record<ReportType, string> = {
    'executive-summary': 'Executive_Summary',
    'detailed-compliance': 'Detailed_Compliance_Report',
    'gap-analysis': 'Gap_Analysis_Report',
    poam: 'POAM_Report',
    'audit-package': 'Audit_Package',
    progress: 'Progress_Report',
  };
  return names[reportType];
}

/**
 * Get report history
 */
export async function getReportHistory(limit: number = 20): Promise<any[]> {
  return await prisma.reportHistory.findMany({
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });
}

/**
 * Delete a report from history
 */
export async function deleteReport(reportId: number): Promise<void> {
  const report = await prisma.reportHistory.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  // Delete file if it exists
  if (report.filePath && fs.existsSync(report.filePath)) {
    fs.unlinkSync(report.filePath);
  }

  // Delete from database
  await prisma.reportHistory.delete({
    where: { id: reportId },
  });
}
```

---

## Step 6: Create Report Controller

📁 **File**: `server/src/controllers/reportController.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import { Request, Response } from 'express';
import {
  generateReport,
  getReportHistory,
  deleteReport,
} from '../services/reports/reportService';
import { ReportOptions } from '../types/reports';
import * as path from 'path';
import * as fs from 'fs';

const REPORTS_DIR = path.join(__dirname, '../../reports');

/**
 * Generate a report
 * POST /api/reports/generate
 */
export async function handleGenerateReport(req: Request, res: Response): Promise<void> {
  try {
    const options: ReportOptions = req.body;

    // Validate options
    if (!options.reportType || !options.format) {
      res.status(400).json({ error: 'Missing required fields: reportType, format' });
      return;
    }

    const result = await generateReport(options);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in handleGenerateReport:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Get report history
 * GET /api/reports/history
 */
export async function handleGetReportHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getReportHistory(limit);
    res.status(200).json(history);
  } catch (error) {
    console.error('Error in handleGetReportHistory:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
}

/**
 * Download a report
 * GET /api/reports/:id/download
 */
export async function handleDownloadReport(req: Request, res: Response): Promise<void> {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const report = await getReportHistory(1000); // Get all to find the specific one
    const targetReport = report.find((r) => r.id === reportId);

    if (!targetReport || !targetReport.filePath) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (!fs.existsSync(targetReport.filePath)) {
      res.status(404).json({ error: 'Report file not found on disk' });
      return;
    }

    res.download(targetReport.filePath, targetReport.reportName);
  } catch (error) {
    console.error('Error in handleDownloadReport:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
}

/**
 * Delete a report
 * DELETE /api/reports/:id
 */
export async function handleDeleteReport(req: Request, res: Response): Promise<void> {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    await deleteReport(reportId);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error in handleDeleteReport:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
}

/**
 * Get available report types
 * GET /api/reports/types
 */
export async function handleGetReportTypes(req: Request, res: Response): Promise<void> {
  const reportTypes = [
    {
      value: 'executive-summary',
      label: 'Executive Summary',
      description: 'High-level overview for management',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'detailed-compliance',
      label: 'Detailed Compliance Report',
      description: 'Comprehensive control-by-control analysis',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'gap-analysis',
      label: 'Gap Analysis Report',
      description: 'Risk-prioritized list of compliance gaps',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'poam',
      label: 'POAM Report',
      description: 'Plan of Action & Milestones tracking',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'audit-package',
      label: 'Audit Package',
      description: 'Complete documentation bundle for auditors',
      formats: ['pdf', 'excel'],
    },
    {
      value: 'progress',
      label: 'Progress Report',
      description: 'Track compliance improvement over time',
      formats: ['csv', 'excel', 'pdf'],
    },
  ];

  res.status(200).json(reportTypes);
}
```

---

## Step 7: Create Report Routes

📁 **File**: `server/src/routes/reportRoutes.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import { Router } from 'express';
import {
  handleGenerateReport,
  handleGetReportHistory,
  handleDownloadReport,
  handleDeleteReport,
  handleGetReportTypes,
} from '../controllers/reportController';

const router = Router();

// Report generation and management
router.post('/generate', handleGenerateReport);
router.get('/history', handleGetReportHistory);
router.get('/types', handleGetReportTypes);
router.get('/:id/download', handleDownloadReport);
router.delete('/:id', handleDeleteReport);

export default router;
```

---

## Step 8: Update Main Server File

📁 **File**: `server/src/index.ts` (or `server/src/app.ts`)

🔍 **FIND** the route registration section (around where other routes are registered):
```typescript
app.use('/api/poams', poamRoutes);
// ... other routes
```

✏️ **ADD AFTER** the existing route registrations:
```typescript
import reportRoutes from './routes/reportRoutes';

app.use('/api/reports', reportRoutes);
```

---

## Step 9: Update Prisma Schema

📁 **File**: `server/prisma/schema.prisma`

🔍 **FIND** the end of the schema file (after the last model).

✏️ **ADD** the new `ReportHistory` model:
```prisma
model ReportHistory {
  id           Int      @id @default(autoincrement())
  reportType   String
  reportName   String
  format       String
  filePath     String?
  fileSize     Int?
  filters      String?
  generatedAt  DateTime @default(now())
  generatedBy  String?
  status       String   @default("completed")
}
```

**Then run the migration**:
```bash
cd server
npx prisma migrate dev --name add_report_history
npx prisma generate
```

---

## Step 10: Testing

### Test CSV Generation

Create a test script or use a REST client to test the endpoints:

**Request** (POST to `http://localhost:3001/api/reports/generate`):
```json
{
  "reportType": "executive-summary",
  "format": "csv",
  "filters": {
    "families": ["AC", "IA"]
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "reportId": 1,
  "filePath": "Executive_Summary_2024-11-10T12-00-00-000Z.csv",
  "fileName": "Executive_Summary_2024-11-10T12-00-00-000Z.csv",
  "fileSize": 5432
}
```

### Test All Report Types

Test each report type with CSV format:
```bash
# Executive Summary
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"executive-summary","format":"csv"}'

# Detailed Compliance
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"detailed-compliance","format":"csv"}'

# Gap Analysis
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"gap-analysis","format":"csv"}'

# POAM
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"poam","format":"csv"}'

# Progress
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"progress","format":"csv"}'
```

### Test Report History
```bash
curl http://localhost:3001/api/reports/history
```

### Test Download
```bash
curl http://localhost:3001/api/reports/1/download -O
```

---

## Verification Checklist

- [ ] Dependencies installed (fast-csv, exceljs, pdfkit, pdfkit-table, canvas)
- [ ] Reports directory created (`server/reports`)
- [ ] TypeScript interfaces created (`server/src/types/reports.ts`)
- [ ] Data aggregator service implemented
- [ ] CSV generator implemented for all report types
- [ ] Main report service created
- [ ] Report controller created
- [ ] Report routes registered
- [ ] Prisma schema updated with ReportHistory model
- [ ] Database migrated successfully
- [ ] All CSV reports generate without errors
- [ ] Report history endpoint returns data
- [ ] Download endpoint serves files correctly
- [ ] Delete endpoint removes files and database records

---

## Troubleshooting

### Issue: "Cannot find module '@fast-csv/format'"
**Solution**: Ensure you installed `fast-csv` and not `fast-csv-format` separately:
```bash
npm install fast-csv
```

### Issue: "ENOENT: no such file or directory, open '/path/to/reports'"
**Solution**: Create the reports directory:
```bash
mkdir -p server/reports
```

### Issue: CSV file is empty or malformed
**Solution**: Check that data aggregation functions are returning data. Add console.log statements to debug:
```typescript
const data = await aggregateExecutiveSummaryData(filters);
console.log('Aggregated data:', JSON.stringify(data, null, 2));
```

### Issue: "Prisma schema validation failed"
**Solution**: Make sure the ReportHistory model is properly formatted and run:
```bash
npx prisma format
npx prisma migrate dev
```

---

## Next Steps

Once Phase 7.1 is complete and verified:
1. Proceed to **Phase 7.2: Excel Report Generation**
2. The CSV foundation will be reused for Excel (similar data structures)
3. All data aggregation functions are ready for use in Excel/PDF generators

---

## Success Criteria

✅ Phase 7.1 is complete when:
1. All report types generate CSV files successfully
2. Report history is tracked in the database
3. Download endpoint serves files correctly
4. Delete endpoint removes files and database records
5. All API endpoints return appropriate status codes and error messages
6. CSV files contain accurate, well-formatted data
7. Reports directory is created and populated with generated files
