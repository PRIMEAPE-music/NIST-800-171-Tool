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
    where.status = {
      status: { in: filters.statuses },
    };
  }

  if (filters.priorities && filters.priorities.length > 0) {
    where.priority = { in: filters.priorities };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.status = where.status || {};
    where.status.implementationDate = {};

    if (filters.dateFrom) {
      where.status.implementationDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.status.implementationDate.lte = new Date(filters.dateTo);
    }
  }

  if (filters.assignedTo) {
    where.status = where.status || {};
    where.status.assignedTo = filters.assignedTo;
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
      status: true,
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 1,
      },
    },
  });

  const totalControls = controls.length;
  const implementedControls = controls.filter(
    (c) =>
      c.status?.status === 'Implemented' ||
      c.status?.status === 'Verified'
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
      control.status?.status === 'Implemented' ||
      control.status?.status === 'Verified'
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
      const status = c.status?.status;
      return status !== 'Implemented' && status !== 'Verified';
    })
    .map((c) => {
      const assessment = c.assessments[0];
      const riskScore = assessment?.riskScore || 0;
      return {
        controlId: c.controlId,
        family: c.family,
        title: c.title,
        status: c.status?.status || 'Not Started',
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
      status: true,
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 1,
      },
      evidence: true,
    },
    orderBy: { controlId: 'asc' },
  });

  const detailedControls: DetailedControlItem[] = controls.map((c) => {
    const status = c.status;
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
  where.status = where.status || {};
  where.status.status = {
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
      status: true,
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
        status: c.status?.status || 'Not Started',
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
    where.actualCompletionDate = null;
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
        orderBy: { dueDate: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const poamItems: POAMReportItem[] = poams.map((p) => {
    const milestonesCompleted = p.milestones.filter((m: any) => m.status === 'Completed').length;
    const milestonesTotalCount = p.milestones.length;
    const isOverdue =
      p.targetCompletionDate && !p.actualCompletionDate
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
      assignedOwner: p.assignedTo,
      startDate: p.startDate?.toISOString() || null,
      targetDate: p.targetCompletionDate?.toISOString() || null,
      completionDate: p.actualCompletionDate?.toISOString() || null,
      budgetEstimate: p.budgetEstimate,
      resourcesRequired: p.resourcesRequired,
      milestones: p.milestones.map((m: any) => ({
        id: m.id,
        description: m.milestoneDescription,
        targetDate: m.dueDate.toISOString(),
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
  _filters?: ReportFilters
): Promise<ProgressReportData> {
  // Current snapshot
  const currentControls = await prisma.control.findMany({
    include: {
      status: true,
    },
  });

  const currentImplemented = currentControls.filter(
    (c) =>
      c.status?.status === 'Implemented' ||
      c.status?.status === 'Verified'
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
  const upcomingMilestones = await prisma.poamMilestone.findMany({
    where: {
      status: { not: 'Completed' },
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: 'asc' },
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
    upcomingMilestones: upcomingMilestones.map((m: any) => ({
      id: m.id,
      description: m.milestoneDescription,
      targetDate: m.dueDate.toISOString(),
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
