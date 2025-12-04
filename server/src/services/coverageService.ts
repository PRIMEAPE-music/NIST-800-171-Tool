import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ControlCoverage {
  controlId: string;
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
  breakdown: {
    technical: CoverageDetail;
    operational: CoverageDetail;
    documentation: CoverageDetail;
    physical: CoverageDetail;
  };
}

export interface CoverageDetail {
  percentage: number;
  numerator: number;
  denominator: number;
  details: string[];
}

export class CoverageService {
  /**
   * Calculate all coverage metrics for a control
   */
  async calculateControlCoverage(controlId: string): Promise<ControlCoverage> {
    const [technical, operational, documentation, physical] = await Promise.all([
      this.calculateTechnicalCoverage(controlId),
      this.calculateOperationalCoverage(controlId),
      this.calculateDocumentationCoverage(controlId),
      this.calculatePhysicalCoverage(controlId),
    ]);

    // Weighted average: Technical 40%, Operational 30%, Documentation 20%, Physical 10%
    const overallCoverage =
      technical.percentage * 0.4 +
      operational.percentage * 0.3 +
      documentation.percentage * 0.2 +
      physical.percentage * 0.1;

    return {
      controlId,
      technicalCoverage: technical.percentage,
      operationalCoverage: operational.percentage,
      documentationCoverage: documentation.percentage,
      physicalCoverage: physical.percentage,
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      breakdown: {
        technical,
        operational,
        documentation,
        physical,
      },
    };
  }

  /**
   * Technical Coverage: M365 settings compliance
   */
  private async calculateTechnicalCoverage(controlId: string): Promise<CoverageDetail> {
    // First get the control's numeric ID
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: { id: true },
    });

    if (!control) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['Control not found'],
      };
    }

    const mappings = await prisma.controlSettingMapping.findMany({
      where: { controlId: control.id },
      include: {
        setting: {
          include: {
            complianceChecks: {
              orderBy: { lastChecked: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (mappings.length === 0) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['No M365 settings mapped to this control'],
      };
    }

    const compliantCount = mappings.filter(mapping => {
      const latestCheck = mapping.setting.complianceChecks[0];
      return latestCheck && latestCheck.isCompliant;
    }).length;

    const percentage = (compliantCount / mappings.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: compliantCount,
      denominator: mappings.length,
      details: [
        `${compliantCount} of ${mappings.length} M365 settings compliant`,
        ...mappings
          .filter(m => {
            const check = m.setting.complianceChecks[0];
            return !check || !check.isCompliant;
          })
          .map(m => `Non-compliant: ${m.setting.displayName}`),
      ],
    };
  }

  /**
   * Operational Coverage: Evidence freshness
   */
  private async calculateOperationalCoverage(controlId: string): Promise<CoverageDetail> {
    // Get the control's numeric ID
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: { id: true },
    });

    if (!control) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['Control not found'],
      };
    }

    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId: control.id,
        evidenceType: { in: ['procedure', 'execution'] },
      },
      include: {
        uploadedEvidence: {
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No operational requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No operational evidence requirements'],
      };
    }

    let score = 0;
    const details: string[] = [];

    for (const req of requirements) {
      if (req.evidenceType === 'procedure') {
        // Procedure requirement: 50% if uploaded
        const hasEvidence = req.uploadedEvidence.length > 0;
        if (hasEvidence) {
          score += 0.5;
          details.push(`✓ Procedure documented: ${req.name}`);
        } else {
          details.push(`✗ Missing procedure: ${req.name}`);
        }
      } else if (req.evidenceType === 'execution') {
        // Execution requirement: check freshness
        const evidence = req.uploadedEvidence[0];
        if (!evidence) {
          details.push(`✗ No execution evidence: ${req.name}`);
          continue;
        }

        const freshnessScore = this.calculateFreshnessScore(
          evidence.executionDate || evidence.uploadedAt || new Date(),
          req.freshnessThreshold || 90
        );

        score += freshnessScore;

        if (freshnessScore >= 0.75) {
          details.push(`✓ Fresh evidence: ${req.name}`);
        } else if (freshnessScore >= 0.5) {
          details.push(`⚠ Aging evidence: ${req.name}`);
        } else {
          details.push(`✗ Stale evidence: ${req.name}`);
        }
      }
    }

    const percentage = requirements.length > 0 ? (score / requirements.length) * 100 : 0;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: Math.round(score * 100) / 100,
      denominator: requirements.length,
      details,
    };
  }

  /**
   * Documentation Coverage: Policy/procedure uploads
   */
  private async calculateDocumentationCoverage(controlId: string): Promise<CoverageDetail> {
    // Get the control's numeric ID
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: { id: true },
    });

    if (!control) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['Control not found'],
      };
    }

    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId: control.id,
        evidenceType: 'policy',
      },
      include: {
        policy: true,
        uploadedEvidence: true,
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No documentation requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No policy documentation requirements'],
      };
    }

    // Check if policies are uploaded (either directly or via policy document)
    const uploadedCount = requirements.filter(req => {
      const hasDirectEvidence = req.uploadedEvidence.length > 0;
      const hasPolicyUpload = req.policy?.filePath != null;
      return hasDirectEvidence || hasPolicyUpload;
    }).length;

    const percentage = (uploadedCount / requirements.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: uploadedCount,
      denominator: requirements.length,
      details: requirements.map(req => {
        const hasEvidence =
          req.uploadedEvidence.length > 0 || req.policy?.filePath != null;
        return hasEvidence
          ? `✓ Policy uploaded: ${req.name}`
          : `✗ Missing policy: ${req.name}`;
      }),
    };
  }

  /**
   * Physical Coverage: Deployment model + evidence
   */
  private async calculatePhysicalCoverage(controlId: string): Promise<CoverageDetail> {
    const config = await prisma.deploymentConfig.findFirst();

    // If cloud-only, automatic 100%
    if (config?.deploymentModel === 'cloud-only') {
      return {
        percentage: 100,
        numerator: 1,
        denominator: 1,
        details: ['Cloud-only deployment - physical controls inherited from Microsoft'],
      };
    }

    // Get the control's numeric ID
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: { id: true },
    });

    if (!control) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['Control not found'],
      };
    }

    // Otherwise, check for physical evidence requirements
    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId: control.id,
        evidenceType: 'physical',
      },
      include: {
        uploadedEvidence: true,
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No physical requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No physical evidence requirements for this control'],
      };
    }

    const uploadedCount = requirements.filter(
      req => req.uploadedEvidence.length > 0
    ).length;

    const percentage = (uploadedCount / requirements.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: uploadedCount,
      denominator: requirements.length,
      details: requirements.map(req =>
        req.uploadedEvidence.length > 0
          ? `✓ Physical evidence uploaded: ${req.name}`
          : `✗ Missing physical evidence: ${req.name}`
      ),
    };
  }

  /**
   * Calculate freshness score based on age vs threshold
   */
  private calculateFreshnessScore(date: Date, thresholdDays: number): number {
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays <= thresholdDays) {
      return 1.0; // Fresh
    } else if (ageInDays <= thresholdDays * 2) {
      return 0.75; // Aging (2x threshold)
    } else if (ageInDays <= thresholdDays * 3) {
      return 0.5; // Stale (3x threshold)
    } else {
      return 0.25; // Critical (>3x threshold)
    }
  }

  /**
   * Calculate coverage for all controls
   */
  async calculateAllCoverage(): Promise<ControlCoverage[]> {
    const controls = await prisma.control.findMany({
      select: { controlId: true },
      orderBy: { controlId: 'asc' },
    });

    const coverages = await Promise.all(
      controls.map(c => this.calculateControlCoverage(c.controlId))
    );

    return coverages;
  }

  /**
   * Get coverage summary statistics
   */
  async getCoverageSummary() {
    const coverages = await this.calculateAllCoverage();

    const avgTechnical =
      coverages.reduce((sum, c) => sum + c.technicalCoverage, 0) / coverages.length;
    const avgOperational =
      coverages.reduce((sum, c) => sum + c.operationalCoverage, 0) / coverages.length;
    const avgDocumentation =
      coverages.reduce((sum, c) => sum + c.documentationCoverage, 0) / coverages.length;
    const avgPhysical =
      coverages.reduce((sum, c) => sum + c.physicalCoverage, 0) / coverages.length;
    const avgOverall =
      coverages.reduce((sum, c) => sum + c.overallCoverage, 0) / coverages.length;

    return {
      totalControls: coverages.length,
      averages: {
        technical: Math.round(avgTechnical * 100) / 100,
        operational: Math.round(avgOperational * 100) / 100,
        documentation: Math.round(avgDocumentation * 100) / 100,
        physical: Math.round(avgPhysical * 100) / 100,
        overall: Math.round(avgOverall * 100) / 100,
      },
      criticalControls: coverages.filter(c => c.overallCoverage < 50).length,
      compliantControls: coverages.filter(c => c.overallCoverage >= 90).length,
    };
  }
}

export const coverageService = new CoverageService();
