import { PrismaClient } from '@prisma/client';
import {
  Document,
  DocumentFilters,
  DocumentCategory,
} from '../types/document.types';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

class DocumentService {
  /**
   * Get all documents with optional filters
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
    const where: any = {
      isActive: filters.isActive ?? true,
    };

    // Category filter
    if (filters.category) {
      where.category = filters.category;
    }

    // File type filter
    if (filters.fileType) {
      where.fileType = { contains: filters.fileType };
    }

    // Organization filter
    if (filters.organization) {
      where.organization = { contains: filters.organization, mode: 'insensitive' };
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

    // Search term filter (filename, title, or description)
    if (filters.searchTerm) {
      where.OR = [
        { originalName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { title: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    // Get documents
    let documents = await prisma.document.findMany({
      where,
      orderBy: { uploadedDate: 'desc' },
    });

    // Apply post-query filters

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      documents = documents.filter((doc) => {
        const docTags = doc.tags ? JSON.parse(doc.tags) : [];
        return filters.tags!.some((tag) => docTags.includes(tag));
      });
    }

    // Parse tags for each document
    return documents.map((doc) => ({
      ...doc,
      uploadedDate: doc.uploadedDate.toISOString(),
      expiryDate: doc.expiryDate?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      tags: doc.tags ? JSON.parse(doc.tags) : [],
    })) as any;
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: number): Promise<Document | null> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return null;
    }

    return {
      ...document,
      uploadedDate: document.uploadedDate.toISOString(),
      expiryDate: document.expiryDate?.toISOString(),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      tags: document.tags ? JSON.parse(document.tags) : [],
    } as any;
  }

  /**
   * Get the active System Security Plan
   */
  async getSystemSecurityPlan(): Promise<Document | null> {
    const sspDocuments = await prisma.document.findMany({
      where: {
        category: 'ssp',
        isActive: true,
      },
      orderBy: { uploadedDate: 'desc' },
      take: 1,
    });

    if (sspDocuments.length === 0) {
      return null;
    }

    const document = sspDocuments[0];
    return {
      ...document,
      uploadedDate: document.uploadedDate.toISOString(),
      expiryDate: document.expiryDate?.toISOString(),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      tags: document.tags ? JSON.parse(document.tags) : [],
    } as any;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: number): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete the file from disk
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      console.error(`Failed to delete file ${document.filePath}:`, error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: number,
    data: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      organization?: string;
      expiryDate?: Date | null;
      tags?: string[];
      version?: string;
    }
  ): Promise<Document> {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.organization !== undefined) updateData.organization = data.organization;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return {
      ...document,
      uploadedDate: document.uploadedDate.toISOString(),
      expiryDate: document.expiryDate?.toISOString(),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      tags: document.tags ? JSON.parse(document.tags) : [],
    } as any;
  }

  /**
   * Toggle document active status
   */
  async toggleDocumentStatus(id: number): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { isActive: !document.isActive },
    });

    return {
      ...updated,
      uploadedDate: updated.uploadedDate.toISOString(),
      expiryDate: updated.expiryDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tags: updated.tags ? JSON.parse(updated.tags) : [],
    } as any;
  }

  /**
   * Get document statistics
   */
  async getDocumentStats() {
    const documents = await prisma.document.findMany({
      where: { isActive: true },
    });

    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      byCategory: documents.reduce((acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byFileType: documents.reduce((acc, doc) => {
        acc[doc.fileType] = (acc[doc.fileType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      hasSSP: documents.some((doc) => doc.category === 'ssp'),
    };

    return stats;
  }
}

export const documentService = new DocumentService();
