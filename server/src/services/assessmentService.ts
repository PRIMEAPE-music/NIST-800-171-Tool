// Business logic for assessment operations

import { PrismaClient } from '@prisma/client';
import {
  AssessmentCreateDto,
  AssessmentUpdateDto,
  AssessmentResponseDto,
  AssessmentStatsDto,
  GapAnalysisDto,
  AssessmentComparisonDto,
} from '../types/assessment.types';
import { RiskScoringService } from './riskScoringService';

const prisma = new PrismaClient();

export class AssessmentService {
  /**
   * Create a new assessment for a control
   */
  public static async createAssessment(
    data: AssessmentCreateDto
  ): Promise<AssessmentResponseDto> {
    // Get control to access priority for risk calculation
    const control = await prisma.control.findUnique({
      where: { id: data.controlId },
    });

    if (!control) {
      throw new Error(`Control with ID ${data.controlId} not found`);
    }

    // Calculate risk score
    const riskScore = RiskScoringService.calculateRiskScore(
      control.priority,
      data.isImplemented,
      data.hasEvidence,
      data.isTested
    );

    // Create assessment with current date
    const assessment = await prisma.assessment.create({
      data: {
        controlId: data.controlId,
        assessmentDate: new Date(),
        isImplemented: data.isImplemented,
        hasEvidence: data.hasEvidence,
        isTested: data.isTested,
        meetsRequirement: data.meetsRequirement,
        assessorNotes: data.assessorNotes,
        riskScore,
      },
      include: {
        control: true,
      },
    });

    return this.mapToResponseDto(assessment);
  }

  /**
   * Get assessment by ID
   */
  public static async getAssessmentById(id: number): Promise<AssessmentResponseDto | null> {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        control: true,
      },
    });

    return assessment ? this.mapToResponseDto(assessment) : null;
  }

  /**
   * Get all assessments with optional filtering
   */
  public static async getAllAssessments(filters?: {
    controlId?: number;
    family?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AssessmentResponseDto[]> {
    const where: any = {};

    if (filters?.controlId) {
      where.controlId = filters.controlId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.assessmentDate = {};
      if (filters.dateFrom) {
        where.assessmentDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.assessmentDate.lte = filters.dateTo;
      }
    }

    if (filters?.family) {
      where.control = {
        family: filters.family,
      };
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        control: true,
      },
      orderBy: {
        assessmentDate: 'desc',
      },
    });

    return assessments.map(this.mapToResponseDto);
  }

  /**
   * Update an existing assessment
   */
  public static async updateAssessment(
    id: number,
    data: AssessmentUpdateDto
  ): Promise<AssessmentResponseDto> {
    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: { control: true },
    });

    if (!existing) {
      throw new Error(`Assessment with ID ${id} not found`);
    }

    // Recalculate risk score if relevant fields changed
    let riskScore = existing.riskScore;
    if (
      data.isImplemented !== undefined ||
      data.hasEvidence !== undefined ||
      data.isTested !== undefined
    ) {
      riskScore = RiskScoringService.calculateRiskScore(
        existing.control.priority,
        data.isImplemented ?? existing.isImplemented,
        data.hasEvidence ?? existing.hasEvidence,
        data.isTested ?? existing.isTested
      );
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        ...data,
        riskScore,
      },
      include: {
        control: true,
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete an assessment
   */
  public static async deleteAssessment(id: number): Promise<void> {
    await prisma.assessment.delete({
      where: { id },
    });
  }

  /**
   * Get latest assessment for each control
   */
  public static async getLatestAssessments(): Promise<AssessmentResponseDto[]> {
    // Get all controls
    const controls = await prisma.control.findMany();

    // Get latest assessment for each control
    const latestAssessments = await Promise.all(
      controls.map(async (control) => {
        const assessment = await prisma.assessment.findFirst({
          where: { controlId: control.id },
          orderBy: { assessmentDate: 'desc' },
          include: { control: true },
        });
        return assessment;
      })
    );

    return latestAssessments
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .map(this.mapToResponseDto);
  }

  /**
   * Get assessment statistics
   */
  public static async getAssessmentStats(): Promise<AssessmentStatsDto> {
    const totalControls = await prisma.control.count();

    // Get latest assessments
    const latestAssessments = await this.getLatestAssessments();

    const assessedControls = latestAssessments.length;
    const implementedControls = latestAssessments.filter((a) => a.isImplemented).length;
    const controlsWithEvidence = latestAssessments.filter((a) => a.hasEvidence).length;
    const testedControls = latestAssessments.filter((a) => a.isTested).length;
    const fullyCompliantControls = latestAssessments.filter(
      (a) => a.isImplemented && a.hasEvidence && a.isTested && a.meetsRequirement
    ).length;

    // Calculate average risk score
    const totalRiskScore = latestAssessments.reduce((sum, a) => sum + a.riskScore, 0);
    const averageRiskScore = assessedControls > 0 ? Math.round(totalRiskScore / assessedControls) : 0;

    // Calculate risk distribution
    const riskDistribution = {
      critical: latestAssessments.filter((a) => a.riskScore >= 76).length,
      high: latestAssessments.filter((a) => a.riskScore >= 51 && a.riskScore < 76).length,
      medium: latestAssessments.filter((a) => a.riskScore >= 26 && a.riskScore < 51).length,
      low: latestAssessments.filter((a) => a.riskScore < 26).length,
    };

    return {
      totalControls,
      assessedControls,
      implementedControls,
      controlsWithEvidence,
      testedControls,
      fullyCompliantControls,
      averageRiskScore,
      riskDistribution,
    };
  }

  /**
   * Get gap analysis (controls with compliance issues)
   */
  public static async getGapAnalysis(): Promise<GapAnalysisDto[]> {
    const latestAssessments = await this.getLatestAssessments();

    // Filter for gaps (any control that's not fully compliant)
    const gaps = latestAssessments
      .filter(
        (a) =>
          !a.isImplemented ||
          !a.hasEvidence ||
          !a.isTested ||
          !a.meetsRequirement
      )
      .map((a) => {
        // Get the control data from the assessment
        const controlData = latestAssessments.find(item => item.controlId === a.controlId);

        return {
          controlId: a.controlId,
          controlNumber: a.controlNumber,
          controlTitle: a.controlTitle,
          family: controlData?.controlNumber.substring(3, 5) || 'Unknown', // Extract family from control number
          priority: 'Medium', // Will be populated from control
          riskScore: a.riskScore,
          isImplemented: a.isImplemented,
          hasEvidence: a.hasEvidence,
          isTested: a.isTested,
          meetsRequirement: a.meetsRequirement,
          gapDescription: RiskScoringService.generateGapDescription(
            a.isImplemented,
            a.hasEvidence,
            a.isTested,
            a.meetsRequirement
          ),
        };
      });

    // Sort by risk score (highest first)
    return gaps.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Compare two assessments
   */
  public static async compareAssessments(
    oldAssessmentDate: Date,
    newAssessmentDate: Date
  ): Promise<AssessmentComparisonDto[]> {
    // Get all controls
    const controls = await prisma.control.findMany();

    const comparisons: AssessmentComparisonDto[] = [];

    for (const control of controls) {
      // Find assessments close to specified dates
      const oldAssessment = await prisma.assessment.findFirst({
        where: {
          controlId: control.id,
          assessmentDate: {
            lte: oldAssessmentDate,
          },
        },
        orderBy: {
          assessmentDate: 'desc',
        },
      });

      const newAssessment = await prisma.assessment.findFirst({
        where: {
          controlId: control.id,
          assessmentDate: {
            gte: newAssessmentDate,
          },
        },
        orderBy: {
          assessmentDate: 'asc',
        },
      });

      // Only include if both assessments exist
      if (oldAssessment && newAssessment) {
        comparisons.push({
          controlNumber: control.controlId,
          controlTitle: control.title,
          oldAssessment: {
            date: oldAssessment.assessmentDate,
            riskScore: oldAssessment.riskScore,
            isImplemented: oldAssessment.isImplemented,
          },
          newAssessment: {
            date: newAssessment.assessmentDate,
            riskScore: newAssessment.riskScore,
            isImplemented: newAssessment.isImplemented,
          },
          improvement: oldAssessment.riskScore - newAssessment.riskScore,
        });
      }
    }

    return comparisons;
  }

  /**
   * Map database model to response DTO
   */
  private static mapToResponseDto(assessment: any): AssessmentResponseDto {
    return {
      id: assessment.id,
      controlId: assessment.controlId,
      controlNumber: assessment.control.controlId,
      controlTitle: assessment.control.title,
      assessmentDate: assessment.assessmentDate,
      isImplemented: assessment.isImplemented,
      hasEvidence: assessment.hasEvidence,
      isTested: assessment.isTested,
      meetsRequirement: assessment.meetsRequirement,
      riskScore: assessment.riskScore,
      assessorNotes: assessment.assessorNotes || undefined,
      createdAt: assessment.createdAt,
    };
  }
}
