import { PrismaClient } from '@prisma/client';
import path from 'path';
import {
  Evidence,
  EvidenceWithControl,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  EvidenceFilters,
  EvidenceStats,
} from '../types/evidence.types';
import { deleteFile, fileExists } from '../utils/file-helpers';
import { validateFileExists } from '../utils/file-validator';

const prisma = new PrismaClient();

export class EvidenceService {
  /**
   * Create evidence record in database
   */
  async createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
    // Validate file exists
    const uploadsDir = process.env.UPLOAD_PATH || './uploads';
    const absolutePath = path.join(uploadsDir, input.filePath);
    const validation = await validateFileExists(absolutePath);

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return await prisma.evidence.create({
      data: {
        controlId: input.controlId,
        fileName: input.fileName,
        originalName: input.originalName,
        filePath: input.filePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
        description: input.description,
        tags: input.tags ? JSON.stringify(input.tags) : null,
      },
    });
  }

  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<EvidenceWithControl[]> {
    const where: any = {};

    if (filters?.controlId) {
      where.controlId = filters.controlId;
    }

    if (filters?.family) {
      where.control = { family: filters.family };
    }

    if (filters?.fileType) {
      where.fileType = { contains: filters.fileType };
    }

    if (filters?.startDate || filters?.endDate) {
      where.uploadedDate = {};
      if (filters.startDate) where.uploadedDate.gte = filters.startDate;
      if (filters.endDate) where.uploadedDate.lte = filters.endDate;
    }

    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    return await prisma.evidence.findMany({
      where,
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            family: true,
            title: true,
          },
        },
      },
      orderBy: { uploadedDate: 'desc' },
    });
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<EvidenceWithControl | null> {
    return await prisma.evidence.findUnique({
      where: { id },
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            family: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Get evidence for specific control
   */
  async getEvidenceForControl(controlId: number): Promise<Evidence[]> {
    return await prisma.evidence.findMany({
      where: { controlId },
      orderBy: { uploadedDate: 'desc' },
    });
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(id: number, input: UpdateEvidenceInput): Promise<Evidence> {
    const data: any = {};

    if (input.description !== undefined) data.description = input.description;
    if (input.isArchived !== undefined) data.isArchived = input.isArchived;
    if (input.tags) data.tags = JSON.stringify(input.tags);

    return await prisma.evidence.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete evidence (record and file)
   */
  async deleteEvidence(id: number): Promise<boolean> {
    const evidence = await prisma.evidence.findUnique({ where: { id } });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Delete file from disk
    const uploadsDir = process.env.UPLOAD_PATH || './uploads';
    const absolutePath = path.join(uploadsDir, evidence.filePath);

    if (fileExists(absolutePath)) {
      await deleteFile(absolutePath);
    }

    // Delete database record
    await prisma.evidence.delete({ where: { id } });

    return true;
  }

  /**
   * Get controls without evidence (gap analysis)
   */
  async getControlsWithoutEvidence(): Promise<any[]> {
    const allControls = await prisma.control.findMany({
      select: {
        id: true,
        controlId: true,
        family: true,
        title: true,
        priority: true,
      },
    });

    const controlsWithEvidence = await prisma.evidence.findMany({
      select: { controlId: true },
      distinct: ['controlId'],
    });

    const evidenceControlIds = new Set(controlsWithEvidence.map(e => e.controlId));

    return allControls.filter(control => !evidenceControlIds.has(control.id));
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const allEvidence = await prisma.evidence.findMany();

    const totalFiles = allEvidence.length;
    const totalSize = allEvidence.reduce((sum, e) => sum + e.fileSize, 0);

    // Count by file type
    const filesByType: Record<string, number> = {};
    allEvidence.forEach(e => {
      const type = e.fileType.split('/')[1] || 'unknown';
      filesByType[type] = (filesByType[type] || 0) + 1;
    });

    // Count controls with evidence
    const controlsWithEvidence = new Set(allEvidence.map(e => e.controlId)).size;
    const totalControls = await prisma.control.count();
    const controlsWithoutEvidence = totalControls - controlsWithEvidence;

    return {
      totalFiles,
      totalSize,
      filesByType,
      controlsWithEvidence,
      controlsWithoutEvidence,
    };
  }
}
