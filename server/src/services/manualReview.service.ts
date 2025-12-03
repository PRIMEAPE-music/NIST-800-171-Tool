// server/src/services/manualReview.service.ts

import { PrismaClient } from '@prisma/client';
import {
  ManualSettingReviewCreate,
  ManualSettingReviewUpdate,
  ManualSettingReviewResponse,
  PolicySettingsComparisonResult,
} from '../types/manualReview.types';

const prisma = new PrismaClient();

class ManualReviewService {
  /**
   * Create or update a manual review for a setting
   */
  async upsertReview(data: ManualSettingReviewCreate): Promise<ManualSettingReviewResponse> {
    const { settingId, policyId, ...reviewData } = data;

    const review = await prisma.manualSettingReview.upsert({
      where: {
        settingId_policyId: {
          settingId,
          policyId: policyId ?? 0, // Use 0 for null to satisfy unique constraint
        },
      },
      create: {
        settingId,
        policyId: policyId || null,
        controlId: reviewData.controlId || null,
        isReviewed: reviewData.isReviewed,
        isConfirmedMapping: reviewData.isConfirmedMapping ?? false,
        reviewedAt: reviewData.isReviewed ? new Date() : null,
        reviewedBy: reviewData.reviewedBy || null,
        manualComplianceStatus: reviewData.manualComplianceStatus || null,
        manualExpectedValue: reviewData.manualExpectedValue || null,
        manualActualValue: reviewData.manualActualValue || null,
        rationale: reviewData.rationale,
      },
      update: {
        isReviewed: reviewData.isReviewed,
        isConfirmedMapping: reviewData.isConfirmedMapping ?? undefined,
        reviewedAt: reviewData.isReviewed ? new Date() : null,
        reviewedBy: reviewData.reviewedBy || null,
        manualComplianceStatus: reviewData.manualComplianceStatus || null,
        manualExpectedValue: reviewData.manualExpectedValue || null,
        manualActualValue: reviewData.manualActualValue || null,
        rationale: reviewData.rationale,
        controlId: reviewData.controlId || undefined,
      },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
    });

    return this.mapToResponse(review);
  }

  /**
   * Get a manual review by setting and policy
   */
  async getReview(settingId: number, policyId?: number): Promise<ManualSettingReviewResponse | null> {
    const review = await prisma.manualSettingReview.findUnique({
      where: {
        settingId_policyId: {
          settingId,
          policyId: policyId ?? 0,
        },
      },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
    });

    return review ? this.mapToResponse(review) : null;
  }

  /**
   * Get all reviews for a setting
   */
  async getReviewsForSetting(settingId: number): Promise<ManualSettingReviewResponse[]> {
    const reviews = await prisma.manualSettingReview.findMany({
      where: { settingId },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reviews.map(this.mapToResponse);
  }

  /**
   * Get all reviews for a control
   */
  async getReviewsForControl(controlId: number): Promise<ManualSettingReviewResponse[]> {
    const reviews = await prisma.manualSettingReview.findMany({
      where: { controlId },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reviews.map(this.mapToResponse);
  }

  /**
   * Delete a manual review
   */
  async deleteReview(id: number): Promise<void> {
    await prisma.manualSettingReview.delete({
      where: { id },
    });
  }

  /**
   * Get all policies for selector (with search/filter)
   */
  async getPoliciesForSelector(params: {
    searchTerm?: string;
    policyType?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const where: any = {};

    if (params.searchTerm) {
      // Only search by policy name (policyDescription can be null in SQLite)
      where.policyName = { contains: params.searchTerm };
    }

    if (params.policyType && params.policyType !== 'all') {
      where.policyType = params.policyType;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const policies = await prisma.m365Policy.findMany({
      where,
      select: {
        id: true,
        policyName: true,
        policyType: true,
        policyDescription: true,
        odataType: true,
        templateFamily: true,
        isActive: true,
        lastSynced: true,
      },
      orderBy: { policyName: 'asc' },
    });

    return policies;
  }

  /**
   * Get policy settings comparison - compares policy against catalog
   */
  async getPolicySettingsComparison(policyId: number): Promise<PolicySettingsComparisonResult> {
    // Get the policy
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Parse policy data
    let policyData: Record<string, any> = {};
    try {
      policyData = JSON.parse(policy.policyData);
    } catch {
      policyData = {};
    }

    // Get catalog settings that match this policy's template
    const catalogSettings = await prisma.m365Setting.findMany({
      where: {
        isActive: true,
        OR: [
          { policyTemplate: policy.odataType },
          { policyType: policy.policyType, policyTemplate: null }, // Fallback to type match
        ],
      },
      include: {
        manualReviews: {
          where: { policyId: policy.id },
          take: 1,
        },
        complianceChecks: {
          where: { policyId: policy.id },
          take: 1,
          orderBy: { lastChecked: 'desc' },
        },
      },
    });

    // Map catalog settings with status
    const catalogSettingsResult = catalogSettings.map((setting) => {
      const actualValue = this.extractValueFromPath(policyData, setting.settingPath);
      const complianceCheck = setting.complianceChecks[0];
      const manualReview = setting.manualReviews[0];

      let status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN' = 'NOT_CONFIGURED';
      if (actualValue !== undefined && actualValue !== null) {
        status = 'CONFIGURED';
      }

      return {
        id: setting.id,
        displayName: setting.displayName,
        settingPath: setting.settingPath,
        expectedValue: setting.expectedValue,
        description: setting.description,
        status,
        actualValue: actualValue !== undefined ? JSON.stringify(actualValue) : null,
        isCompliant: complianceCheck?.isCompliant ?? null,
        manualReview: manualReview ? this.mapToResponse(manualReview as any) : null,
      };
    });

    // Find uncatalogued settings (in policy but not in catalog)
    const catalogPaths = new Set(catalogSettings.map((s) => s.settingPath.toLowerCase()));
    const uncataloguedSettings = this.findUncataloguedSettings(policyData, catalogPaths);

    // Build summary
    const configuredCount = catalogSettingsResult.filter((s) => s.status === 'CONFIGURED').length;
    const reviewedCount = catalogSettingsResult.filter((s) => s.manualReview?.isReviewed).length;

    return {
      policy: {
        id: policy.id,
        policyName: policy.policyName,
        policyType: policy.policyType,
        odataType: policy.odataType,
        templateFamily: policy.templateFamily,
      },
      catalogSettings: catalogSettingsResult,
      uncataloguedSettings,
      summary: {
        totalCatalogSettings: catalogSettings.length,
        configuredCount,
        notConfiguredCount: catalogSettings.length - configuredCount,
        uncataloguedCount: uncataloguedSettings.length,
        reviewedCount,
      },
    };
  }

  /**
   * Get raw policy settings data
   */
  async getPolicyRawSettings(policyId: number): Promise<Record<string, any>> {
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: { policyData: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    try {
      return JSON.parse(policy.policyData);
    } catch {
      return {};
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapToResponse(review: any): ManualSettingReviewResponse {
    return {
      id: review.id,
      settingId: review.settingId,
      policyId: review.policyId,
      controlId: review.controlId,
      isReviewed: review.isReviewed,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      reviewedBy: review.reviewedBy,
      manualComplianceStatus: review.manualComplianceStatus,
      manualExpectedValue: review.manualExpectedValue,
      manualActualValue: review.manualActualValue,
      rationale: review.rationale,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      setting: review.setting,
      policy: review.policy,
    };
  }

  private extractValueFromPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      // Handle array notation like "items[0]"
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]];
        if (Array.isArray(current)) {
          current = current[parseInt(arrayMatch[2])];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  private findUncataloguedSettings(
    obj: any,
    catalogPaths: Set<string>,
    prefix = ''
  ): Array<{ path: string; value: any }> {
    const uncatalogued: Array<{ path: string; value: any }> = [];

    if (!obj || typeof obj !== 'object') return uncatalogued;

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      // Skip common metadata fields
      if (['@odata.type', '@odata.context', 'id', 'createdDateTime', 'lastModifiedDateTime'].includes(key)) {
        continue;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        uncatalogued.push(...this.findUncataloguedSettings(value, catalogPaths, path));
      } else if (!catalogPaths.has(path.toLowerCase())) {
        uncatalogued.push({ path, value });
      }
    }

    return uncatalogued;
  }

  /**
   * Add evidence files to a manual review
   */
  async addEvidenceToReview(reviewId: number, files: Express.Multer.File[]): Promise<void> {
    // First verify the review exists
    const review = await prisma.manualSettingReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error(`Manual review ${reviewId} not found`);
    }

    // Create evidence records and link them to the review
    for (const file of files) {
      // Create evidence record (assuming controlId from the review's controlId)
      const evidence = await prisma.evidence.create({
        data: {
          controlId: review.controlId || 1, // Default to control 1 if not set
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileType: file.mimetype,
          fileSize: file.size,
          description: `Evidence for manual review of setting ${review.settingId}`,
        },
      });

      // Create the link between review and evidence
      await prisma.manualReviewEvidence.create({
        data: {
          reviewId: reviewId,
          evidenceId: evidence.id,
        },
      });
    }
  }

  /**
   * Get evidence files for a manual review
   */
  async getEvidenceForReview(reviewId: number) {
    const evidenceLinks = await prisma.manualReviewEvidence.findMany({
      where: { reviewId },
      include: {
        evidence: true,
      },
    });

    return evidenceLinks.map(link => link.evidence);
  }

  /**
   * Delete an evidence file from a manual review
   */
  async deleteEvidenceFromReview(reviewId: number, evidenceId: number): Promise<void> {
    // Delete the link (this will cascade delete if needed)
    await prisma.manualReviewEvidence.deleteMany({
      where: {
        reviewId,
        evidenceId,
      },
    });
  }
}

export const manualReviewService = new ManualReviewService();
export default manualReviewService;
