import { prisma } from '../config/database';

export interface ControlCoverageResponse {
  controlId: string;
  controlTitle: string;

  // Coverage percentages
  technicalCoverage: number;
  policyCoverage: number;
  proceduralCoverage: number;
  evidenceCoverage: number;
  overallCoverage: number;

  // Gaps
  gaps: {
    id: number;
    gapType: string;
    gapTitle: string;
    gapDescription: string;
    nistRequirement: string;
    severity: string;
    status: string;
    remediationGuidance: string;
    assignedTo?: string;
    dueDate?: string;
  }[];

  // Counts
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  openGaps: number;

  // Status
  complianceStatus: string;

  // Assessment info
  lastAssessed: string;
}

class GapAnalysisService {
  /**
   * Get comprehensive gap analysis for a control
   */
  async getControlGapAnalysis(controlId: string): Promise<ControlCoverageResponse | null> {
    const control = await prisma.control.findUnique({
      where: { controlId },
      include: {
        coverage: true,
        gaps: {
          orderBy: [
            { severity: 'desc' },
            { gapType: 'asc' },
          ],
        },
      },
    });

    if (!control) return null;

    const coverage = control.coverage || {
      technicalCoverage: 0,
      policyCoverage: 0,
      proceduralCoverage: 0,
      evidenceCoverage: 0,
      overallCoverage: 0,
      totalGaps: 0,
      criticalGaps: 0,
      highGaps: 0,
      mediumGaps: 0,
      lowGaps: 0,
      complianceStatus: 'unknown',
      lastAssessed: new Date(),
    };

    const openGaps = control.gaps.filter(g => g.status === 'open' || g.status === 'in_progress');

    return {
      controlId: control.controlId,
      controlTitle: control.title,
      technicalCoverage: coverage.technicalCoverage,
      policyCoverage: coverage.policyCoverage,
      proceduralCoverage: coverage.proceduralCoverage,
      evidenceCoverage: coverage.evidenceCoverage,
      overallCoverage: coverage.overallCoverage,
      gaps: control.gaps.map(gap => ({
        id: gap.id,
        gapType: gap.gapType,
        gapTitle: gap.gapTitle,
        gapDescription: gap.gapDescription,
        nistRequirement: gap.nistRequirement,
        severity: gap.severity,
        status: gap.status,
        remediationGuidance: gap.remediationGuidance,
        assignedTo: gap.assignedTo || undefined,
        dueDate: gap.dueDate?.toISOString(),
      })),
      totalGaps: coverage.totalGaps,
      criticalGaps: coverage.criticalGaps,
      highGaps: coverage.highGaps,
      openGaps: openGaps.length,
      complianceStatus: coverage.complianceStatus,
      lastAssessed: coverage.lastAssessed.toISOString(),
    };
  }

  /**
   * Get gap summary across all controls
   */
  async getOverallGapSummary() {
    const coverageRecords = await prisma.controlCoverage.findMany({
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            family: true,
          },
        },
      },
    });

    const totalControls = coverageRecords.length;
    const compliantControls = coverageRecords.filter(c => c.complianceStatus === 'compliant').length;
    const partialControls = coverageRecords.filter(c => c.complianceStatus === 'partial').length;
    const nonCompliantControls = coverageRecords.filter(c => c.complianceStatus === 'non_compliant').length;

    const avgTechnical = Math.round(
      coverageRecords.reduce((sum, c) => sum + c.technicalCoverage, 0) / totalControls
    );
    const avgPolicy = Math.round(
      coverageRecords.reduce((sum, c) => sum + c.policyCoverage, 0) / totalControls
    );
    const avgProcedural = Math.round(
      coverageRecords.reduce((sum, c) => sum + c.proceduralCoverage, 0) / totalControls
    );
    const avgOverall = Math.round(
      coverageRecords.reduce((sum, c) => sum + c.overallCoverage, 0) / totalControls
    );

    const totalGaps = coverageRecords.reduce((sum, c) => sum + c.totalGaps, 0);
    const criticalGaps = coverageRecords.reduce((sum, c) => sum + c.criticalGaps, 0);
    const highGaps = coverageRecords.reduce((sum, c) => sum + c.highGaps, 0);

    // Get open gaps count
    const openGapsCount = await prisma.controlGap.count({
      where: {
        OR: [
          { status: 'open' },
          { status: 'in_progress' },
        ],
      },
    });

    return {
      totalControls,
      compliantControls,
      partialControls,
      nonCompliantControls,
      compliancePercentage: Math.round((compliantControls / totalControls) * 100),

      averageCoverage: {
        technical: avgTechnical,
        policy: avgPolicy,
        procedural: avgProcedural,
        overall: avgOverall,
      },

      gapCounts: {
        total: totalGaps,
        open: openGapsCount,
        critical: criticalGaps,
        high: highGaps,
      },

      controlsByStatus: {
        compliant: compliantControls,
        partial: partialControls,
        non_compliant: nonCompliantControls,
      },
    };
  }

  /**
   * Update gap status
   */
  async updateGapStatus(
    gapId: number,
    updates: {
      status?: string;
      assignedTo?: string;
      dueDate?: Date;
      notes?: string;
    }
  ) {
    const gap = await prisma.controlGap.update({
      where: { id: gapId },
      data: {
        ...updates,
        resolvedDate: updates.status === 'resolved' ? new Date() : undefined,
      },
    });

    // Recalculate coverage for the control
    await this.recalculateControlCoverage(gap.controlId);

    return gap;
  }

  /**
   * Recalculate coverage for a control
   */
  async recalculateControlCoverage(controlId: number) {
    const gaps = await prisma.controlGap.findMany({
      where: { controlId },
    });

    const technicalGaps = gaps.filter(g => g.gapType === 'technical' && g.status !== 'resolved');
    const policyGaps = gaps.filter(g => g.gapType === 'policy' && g.status !== 'resolved');
    const procedureGaps = gaps.filter(g => g.gapType === 'procedure' && g.status !== 'resolved');
    const evidenceGaps = gaps.filter(g => g.gapType === 'evidence' && g.status !== 'resolved');

    const technicalTotal = gaps.filter(g => g.gapType === 'technical').length;
    const policyTotal = gaps.filter(g => g.gapType === 'policy').length;
    const procedureTotal = gaps.filter(g => g.gapType === 'procedure').length;
    const evidenceTotal = gaps.filter(g => g.gapType === 'evidence').length;

    const technicalCoverage = technicalTotal > 0
      ? Math.round(((technicalTotal - technicalGaps.length) / technicalTotal) * 100)
      : 100;
    const policyCoverage = policyTotal > 0
      ? Math.round(((policyTotal - policyGaps.length) / policyTotal) * 100)
      : 100;
    const proceduralCoverage = procedureTotal > 0
      ? Math.round(((procedureTotal - procedureGaps.length) / procedureTotal) * 100)
      : 100;
    const evidenceCoverage = evidenceTotal > 0
      ? Math.round(((evidenceTotal - evidenceGaps.length) / evidenceTotal) * 100)
      : 100;

    const overallCoverage = Math.round(
      technicalCoverage * 0.4 +
      policyCoverage * 0.3 +
      proceduralCoverage * 0.2 +
      evidenceCoverage * 0.1
    );

    let complianceStatus = 'unknown';
    if (overallCoverage >= 95) complianceStatus = 'compliant';
    else if (overallCoverage >= 50) complianceStatus = 'partial';
    else if (overallCoverage > 0) complianceStatus = 'non_compliant';

    const openGaps = gaps.filter(g => g.status !== 'resolved');

    await prisma.controlCoverage.upsert({
      where: { controlId },
      create: {
        controlId,
        technicalCoverage,
        policyCoverage,
        proceduralCoverage,
        evidenceCoverage,
        overallCoverage,
        totalGaps: openGaps.length,
        criticalGaps: openGaps.filter(g => g.severity === 'critical').length,
        highGaps: openGaps.filter(g => g.severity === 'high').length,
        mediumGaps: openGaps.filter(g => g.severity === 'medium').length,
        lowGaps: openGaps.filter(g => g.severity === 'low').length,
        complianceStatus,
      },
      update: {
        technicalCoverage,
        policyCoverage,
        proceduralCoverage,
        evidenceCoverage,
        overallCoverage,
        totalGaps: openGaps.length,
        criticalGaps: openGaps.filter(g => g.severity === 'critical').length,
        highGaps: openGaps.filter(g => g.severity === 'high').length,
        mediumGaps: openGaps.filter(g => g.severity === 'medium').length,
        lowGaps: openGaps.filter(g => g.severity === 'low').length,
        complianceStatus,
        lastAssessed: new Date(),
      },
    });
  }
}

export const gapAnalysisService = new GapAnalysisService();
