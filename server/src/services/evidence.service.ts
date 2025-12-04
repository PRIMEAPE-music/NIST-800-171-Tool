import { PrismaClient } from '@prisma/client';
import {
  EvidenceWithMappings,
  EvidenceFilters,
  EvidenceStats,
  EvidenceCoverage,
  ControlSuggestion,
  BulkUploadResult,
  ManualReviewEvidenceSummary,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class EvidenceService {
  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters: EvidenceFilters = {}): Promise<EvidenceWithMappings[]> {
    const where: any = {
      isArchived: filters.isArchived ?? false,
    };

    // Evidence type filter
    if (filters.evidenceType) {
      where.evidenceType = filters.evidenceType;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // File type filter
    if (filters.fileType) {
      where.fileType = { contains: filters.fileType };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.uploadedDate = {};
      if (filters.startDate) {
        where.uploadedDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.uploadedDate.lte = filters.endDate;
      }
    }

    // Uploaded by filter
    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }

    // Search term filter (filename or description)
    if (filters.searchTerm) {
      where.OR = [
        { originalName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    // Get evidence with mappings
    let evidence = await prisma.evidence.findMany({
      where,
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                id: true,
                controlId: true,
                family: true,
                title: true,
                priority: true,
              },
            },
          },
        },
        manualReviewLinks: {
          include: {
            review: {
              select: {
                id: true,
                settingId: true,
                policyId: true,
                controlId: true,
              },
            },
          },
        },
      },
      orderBy: { uploadedDate: 'desc' },
    });

    // Apply post-query filters

    // Control ID filter
    if (filters.controlId) {
      evidence = evidence.filter((e) =>
        e.controlMappings.some((m) => m.controlId === filters.controlId)
      );
    }

    // Family filter
    if (filters.family) {
      evidence = evidence.filter((e) =>
        e.controlMappings.some((m) => m.control.family === filters.family)
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      evidence = evidence.filter((e) => {
        const evidenceTags = e.tags ? JSON.parse(e.tags) : [];
        return filters.tags!.some((tag) => evidenceTags.includes(tag));
      });
    }

    // Has multiple controls filter
    if (filters.hasMultipleControls !== undefined) {
      evidence = evidence.filter((e) =>
        filters.hasMultipleControls
          ? e.controlMappings.length > 1
          : e.controlMappings.length <= 1
      );
    }

    // Parse tags for each evidence
    return evidence.map((e) => ({
      ...e,
      tags: e.tags ? JSON.parse(e.tags) : [],
    })) as any;
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<EvidenceWithMappings | null> {
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                id: true,
                controlId: true,
                family: true,
                title: true,
                priority: true,
              },
            },
          },
        },
        manualReviewLinks: {
          include: {
            review: {
              select: {
                id: true,
                settingId: true,
                policyId: true,
                controlId: true,
              },
            },
          },
        },
      },
    });

    if (!evidence) return null;

    return {
      ...evidence,
      tags: evidence.tags ? JSON.parse(evidence.tags) : [],
    } as any;
  }

  /**
   * Get evidence for a specific control
   */
  async getEvidenceForControl(controlId: number): Promise<EvidenceWithMappings[]> {
    return this.getEvidence({ controlId });
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const [
      totalFiles,
      allEvidence,
      totalControls,
      controlsWithEvidence,
      recentUploads,
    ] = await Promise.all([
      prisma.evidence.count({ where: { isArchived: false } }),
      prisma.evidence.findMany({
        where: { isArchived: false },
        select: {
          fileSize: true,
          evidenceType: true,
          status: true,
          uploadedDate: true,
          controlMappings: {
            select: {
              control: {
                select: { family: true },
              },
            },
          },
        },
      }),
      prisma.control.count(),
      prisma.control.count({
        where: {
          evidenceMappings: {
            some: {},
          },
        },
      }),
      prisma.evidence.count({
        where: {
          uploadedDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
          isArchived: false,
        },
      }),
    ]);

    // Calculate statistics
    const totalSize = allEvidence.reduce((sum, e) => sum + e.fileSize, 0);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byFamily: Record<string, number> = {};
    let totalMappings = 0;
    let multiControlCount = 0;

    allEvidence.forEach((e) => {
      // By type
      byType[e.evidenceType] = (byType[e.evidenceType] || 0) + 1;

      // By status
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;

      // By family
      e.controlMappings.forEach((m) => {
        const family = m.control.family;
        byFamily[family] = (byFamily[family] || 0) + 1;
      });

      // Multi-control evidence
      if (e.controlMappings.length > 1) {
        multiControlCount++;
      }

      totalMappings += e.controlMappings.length;
    });

    return {
      totalFiles,
      totalSize,
      byType: byType as any,
      byStatus: byStatus as any,
      byFamily,
      controlsWithEvidence,
      controlsWithoutEvidence: totalControls - controlsWithEvidence,
      averageControlsPerEvidence: totalFiles > 0 ? totalMappings / totalFiles : 0,
      multiControlEvidenceCount: multiControlCount,
      recentUploads,
    };
  }

  /**
   * Get evidence coverage for all controls
   */
  async getEvidenceCoverage(family?: string): Promise<EvidenceCoverage[]> {
    const where: any = {};
    if (family) {
      where.family = family;
    }

    const controls = await prisma.control.findMany({
      where,
      include: {
        evidenceMappings: {
          where: {
            evidence: {
              isArchived: false,
            },
          },
        },
        evidenceRequirements: true,
      },
    });

    return controls.map((control) => {
      const totalRequirements = control.evidenceRequirements.length;
      const evidenceCount = control.evidenceMappings.length;

      // For now, simple calculation - can be enhanced with requirement fulfillment tracking
      const coveragePercentage =
        totalRequirements > 0
          ? Math.round((evidenceCount / totalRequirements) * 100)
          : evidenceCount > 0
          ? 100
          : 0;

      return {
        controlId: control.id,
        control: {
          id: control.id,
          controlId: control.controlId,
          family: control.family,
          title: control.title,
          priority: control.priority,
        },
        totalRequirements,
        fulfilledRequirements: Math.min(evidenceCount, totalRequirements),
        partialRequirements: 0, // TODO: Implement partial fulfillment tracking
        missingRequirements: Math.max(0, totalRequirements - evidenceCount),
        coveragePercentage,
        evidenceCount,
        lastUpdated: new Date(),
      };
    });
  }

  /**
   * Suggest controls for evidence based on filename and type
   */
  async suggestControlsForEvidence(
    filename: string,
    evidenceType?: EvidenceType
  ): Promise<ControlSuggestion[]> {
    // Extract keywords from filename
    const keywords = this.extractKeywords(filename);

    // Check templates first
    const templates = await prisma.evidenceTemplate.findMany({
      where: {
        isActive: true,
        ...(evidenceType && { evidenceType }),
      },
    });

    const suggestions: ControlSuggestion[] = [];
    const processedControlIds = new Set<string>();

    // Match against templates
    for (const template of templates) {
      const templateKeywords = JSON.parse(template.keywords);
      const matchScore = this.calculateKeywordMatchScore(keywords, templateKeywords);

      if (matchScore > 0.3) {
        // 30% threshold
        const suggestedControlIds = JSON.parse(template.suggestedControls);

        for (const controlId of suggestedControlIds) {
          if (processedControlIds.has(controlId)) continue;

          const control = await prisma.control.findUnique({
            where: { controlId },
            select: {
              id: true,
              controlId: true,
              family: true,
              title: true,
              priority: true,
            },
          });

          if (control) {
            suggestions.push({
              controlId: control.controlId,
              control,
              suggestedRelationship: template.defaultRelationship as EvidenceRelationship,
              confidenceScore: matchScore,
              reason: `Matches template: ${template.name}`,
              keywords: templateKeywords,
            });
            processedControlIds.add(controlId);
          }
        }
      }
    }

    // Fallback: Match against control titles and requirements
    if (suggestions.length === 0) {
      const controls = await prisma.control.findMany({
        include: {
          evidenceRequirements: true,
        },
      });

      for (const control of controls) {
        const titleKeywords = this.extractKeywords(control.title);
        const requirementKeywords = control.evidenceRequirements.flatMap((req) =>
          this.extractKeywords(req.name + ' ' + req.description)
        );

        const allControlKeywords = [...titleKeywords, ...requirementKeywords];
        const matchScore = this.calculateKeywordMatchScore(keywords, allControlKeywords);

        if (matchScore > 0.2) {
          // Lower threshold for direct matching
          suggestions.push({
            controlId: control.controlId,
            control: {
              id: control.id,
              controlId: control.controlId,
              family: control.family,
              title: control.title,
              priority: control.priority,
            },
            suggestedRelationship: 'supporting',
            confidenceScore: matchScore,
            reason: 'Keyword match with control requirements',
            keywords: allControlKeywords.slice(0, 5),
          });
        }
      }
    }

    // Sort by confidence score
    return suggestions
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 20); // Return top 20 suggestions
  }

  /**
   * Upload evidence with optional control mappings
   */
  async uploadEvidence(data: {
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    evidenceType: EvidenceType;
    description?: string;
    uploadedBy?: string;
    tags?: string[];
    controlMappings?: Array<{
      controlId: number;
      relationship: EvidenceRelationship;
      notes?: string;
    }>;
  }): Promise<EvidenceWithMappings> {
    // Create evidence record
    const evidence = await prisma.evidence.create({
      data: {
        fileName: data.fileName,
        originalName: data.originalName,
        filePath: data.filePath,
        fileType: data.fileType,
        fileSize: data.fileSize,
        evidenceType: data.evidenceType,
        description: data.description,
        uploadedBy: data.uploadedBy,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        status: 'uploaded',
      },
    });

    // Create control mappings if provided
    if (data.controlMappings && data.controlMappings.length > 0) {
      await prisma.evidenceControlMapping.createMany({
        data: data.controlMappings.map((mapping) => ({
          evidenceId: evidence.id,
          controlId: mapping.controlId,
          relationship: mapping.relationship,
          notes: mapping.notes,
          mappedBy: data.uploadedBy || 'user',
          mappedAt: new Date(),
        })),
      });
    }

    return this.getEvidenceById(evidence.id) as Promise<EvidenceWithMappings>;
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    id: number,
    data: {
      description?: string;
      tags?: string[];
      evidenceType?: EvidenceType;
      status?: string;
      reviewNotes?: string;
    }
  ): Promise<EvidenceWithMappings> {
    await prisma.evidence.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
        ...(data.evidenceType !== undefined && { evidenceType: data.evidenceType }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.reviewNotes !== undefined && { reviewNotes: data.reviewNotes }),
      },
    });

    return this.getEvidenceById(id) as Promise<EvidenceWithMappings>;
  }

  /**
   * Add control mapping to evidence
   */
  async addControlMapping(data: {
    evidenceId: number;
    controlId: number;
    relationship: EvidenceRelationship;
    notes?: string;
    mappedBy?: string;
    requirementId?: number;
  }): Promise<void> {
    await prisma.evidenceControlMapping.create({
      data: {
        evidenceId: data.evidenceId,
        controlId: data.controlId,
        relationship: data.relationship,
        notes: data.notes,
        mappedBy: data.mappedBy || 'user',
        mappedAt: new Date(),
        requirementId: data.requirementId,
      },
    });
  }

  /**
   * Remove control mapping from evidence
   */
  async removeControlMapping(evidenceId: number, controlId: number): Promise<void> {
    await prisma.evidenceControlMapping.delete({
      where: {
        evidenceId_controlId: {
          evidenceId,
          controlId,
        },
      },
    });
  }

  /**
   * Update control mapping
   */
  async updateControlMapping(
    mappingId: number,
    data: {
      relationship?: EvidenceRelationship;
      notes?: string;
      isVerified?: boolean;
      verifiedBy?: string;
    }
  ): Promise<void> {
    await prisma.evidenceControlMapping.update({
      where: { id: mappingId },
      data: {
        ...(data.relationship !== undefined && { relationship: data.relationship }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
        ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
        ...(data.isVerified && { verifiedAt: new Date() }),
      },
    });
  }

  /**
   * Verify control mapping
   */
  async verifyControlMapping(mappingId: number, verifiedBy: string): Promise<void> {
    await prisma.evidenceControlMapping.update({
      where: { id: mappingId },
      data: {
        isVerified: true,
        verifiedBy,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(id: number): Promise<void> {
    // Get evidence to delete file
    const evidence = await prisma.evidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Delete file from filesystem
    const fullPath = path.join(process.cwd(), evidence.filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascades to mappings)
    await prisma.evidence.delete({
      where: { id },
    });
  }

  /**
   * Archive evidence
   */
  async archiveEvidence(
    id: number,
    archivedBy: string,
    reason?: string
  ): Promise<void> {
    await prisma.evidence.update({
      where: { id },
      data: {
        isArchived: true,
        archivedBy,
        archivedAt: new Date(),
        archivedReason: reason,
      },
    });
  }

  /**
   * Unarchive evidence
   */
  async unarchiveEvidence(id: number): Promise<void> {
    await prisma.evidence.update({
      where: { id },
      data: {
        isArchived: false,
        archivedBy: null,
        archivedAt: null,
        archivedReason: null,
      },
    });
  }

  /**
   * Get manual review evidence summary
   */
  async getManualReviewEvidenceSummary(): Promise<ManualReviewEvidenceSummary> {
    const [totalReviews, evidenceWithReviews] = await Promise.all([
      prisma.manualSettingReview.count(),
      prisma.evidence.findMany({
        where: {
          manualReviewLinks: {
            some: {},
          },
          isArchived: false,
        },
        include: {
          manualReviewLinks: {
            include: {
              review: {
                include: {
                  control: {
                    select: {
                      controlId: true,
                      title: true,
                    },
                  },
                  setting: {
                    select: {
                      displayName: true,
                      settingPath: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      totalReviews,
      reviewsWithEvidence: evidenceWithReviews.length,
      evidenceFiles: evidenceWithReviews.map((e) => ({
        id: e.id,
        originalName: e.originalName,
        fileType: e.fileType,
        uploadedDate: e.uploadedDate,
        reviews: e.manualReviewLinks.map((link) => ({
          id: link.review.id,
          controlId: link.review.controlId,
          control: link.review.control
            ? {
                controlId: link.review.control.controlId,
                title: link.review.control.title,
              }
            : undefined,
          settingId: link.review.settingId,
          setting: {
            displayName: link.review.setting.displayName,
            settingPath: link.review.setting.settingPath,
          },
          manualComplianceStatus: link.review.manualComplianceStatus,
        })),
      })),
    };
  }

  // ======== Helper Methods ========

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove file extensions and special characters
    const cleaned = text
      .toLowerCase()
      .replace(/\.(pdf|docx|xlsx|png|jpg|jpeg|txt|csv)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');

    // Split into words and filter out common words
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      '2024',
      '2025',
      'file',
      'document',
      'report',
    ]);

    return cleaned
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // Unique words
  }

  /**
   * Calculate keyword match score between two keyword arrays
   */
  private calculateKeywordMatchScore(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
    const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

    let matches = 0;
    for (const keyword of set1) {
      if (set2.has(keyword)) {
        matches++;
      }
    }

    // Return Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return matches / union.size;
  }
}

export const evidenceService = new EvidenceService();
