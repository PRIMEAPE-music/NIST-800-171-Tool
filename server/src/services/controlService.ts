import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { ControlStatus } from '@/types/enums';

export class ControlService {
  /**
   * Get all controls with optional filtering and pagination
   */
  async getAllControls(filters?: {
    family?: string;
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const where: Prisma.ControlWhereInput = {};

      if (filters?.family) {
        where.family = filters.family;
      }

      if (filters?.priority) {
        where.priority = filters.priority;
      }

      if (filters?.search) {
        where.OR = [
          { controlId: { contains: filters.search } },
          { title: { contains: filters.search } },
          { requirementText: { contains: filters.search } },
        ];
      }

      // Handle status filter (requires join)
      if (filters?.status) {
        where.status = { status: filters.status };
      }

      // Setup pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      // Setup sorting
      const sortBy = filters?.sortBy || 'controlId';
      const sortOrder = filters?.sortOrder || 'asc';

      // Fetch controls and total count in parallel
      const [controls, total] = await Promise.all([
        prisma.control.findMany({
          where,
          include: {
            status: true,
            assessments: {
              orderBy: { assessmentDate: 'desc' },
              take: 1,
            },
            evidence: {
              select: { id: true }, // Just count
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.control.count({ where }),
      ]);

      return {
        controls,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching controls:', error);
      throw error;
    }
  }

  /**
   * Get control by ID with all relations
   */
  async getControlById(id: number) {
    try {
      return await prisma.control.findUnique({
        where: { id },
        include: {
          status: true,
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 5,
          },
          evidence: true,
          poams: {
            include: {
              milestones: true,
            },
          },
          policyMappings: {
            include: {
              policy: true,
            },
          },
          changeHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      logger.error(`Error fetching control ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get control by control ID (e.g., "03.01.01" for Rev 3)
   */
  async getControlByControlId(controlId: string) {
    try {
      return await prisma.control.findUnique({
        where: { controlId },
        include: {
          status: true,
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 5,
          },
          evidence: true,
          poams: {
            include: {
              milestones: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error(`Error fetching control ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats() {
    try {
      const total = await prisma.control.count();

      const statuses = await prisma.controlStatus.groupBy({
        by: ['status'],
        _count: true,
      });

      const statusCounts: Record<string, number> = {
        'Not Started': 0,
        'In Progress': 0,
        'Implemented': 0,
        'Not Applicable': 0,
      };

      statuses.forEach((s) => {
        statusCounts[s.status] = s._count;
      });

      const familyStats = await prisma.control.groupBy({
        by: ['family'],
        _count: true,
      });

      const priorityStats = await prisma.control.groupBy({
        by: ['priority'],
        _count: true,
      });

      return {
        total,
        byStatus: statusCounts,
        byFamily: familyStats,
        byPriority: priorityStats,
        compliancePercentage: Math.round(
          ((statusCounts['Implemented'] + (statusCounts['Not Applicable'] || 0)) / total) * 100
        ),
      };
    } catch (error) {
      logger.error('Error fetching compliance stats:', error);
      throw error;
    }
  }

  /**
   * Update control (implementation notes, assignedTo, nextReviewDate)
   */
  async updateControl(
    controlId: number,
    data: {
      implementationNotes?: string;
      assignedTo?: string;
      nextReviewDate?: Date;
    }
  ) {
    try {
      // Get current status for comparison
      const currentStatus = await prisma.controlStatus.findUnique({
        where: { controlId },
      });

      if (!currentStatus) {
        throw new Error('Control status not found');
      }

      // Update status
      const updatedStatus = await prisma.controlStatus.update({
        where: { controlId },
        data: {
          implementationNotes: data.implementationNotes,
          assignedTo: data.assignedTo,
          nextReviewDate: data.nextReviewDate,
          updatedAt: new Date(),
        },
      });

      // Log changes
      const changes = [];
      if (currentStatus.implementationNotes !== data.implementationNotes) {
        changes.push({
          controlId,
          fieldChanged: 'implementationNotes',
          oldValue: currentStatus.implementationNotes,
          newValue: data.implementationNotes || null,
          changedBy: data.assignedTo || null,
        });
      }
      if (currentStatus.assignedTo !== data.assignedTo) {
        changes.push({
          controlId,
          fieldChanged: 'assignedTo',
          oldValue: currentStatus.assignedTo,
          newValue: data.assignedTo || null,
          changedBy: data.assignedTo || null,
        });
      }

      if (changes.length > 0) {
        await prisma.changeHistory.createMany({
          data: changes,
        });
      }

      return updatedStatus;
    } catch (error) {
      logger.error(`Error updating control ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Update control status specifically (PATCH endpoint)
   */
  async updateControlStatus(
    controlId: number,
    data: {
      status: string;
      implementationDate?: Date;
      lastReviewedDate?: Date;
      assignedTo?: string;
    }
  ) {
    try {
      // Check if control exists
      const control = await prisma.control.findUnique({
        where: { id: controlId },
        include: {
          status: true,
        },
      });

      if (!control) {
        throw new Error('Control not found');
      }

      // Update or create control status
      const updatedStatus = await prisma.controlStatus.upsert({
        where: { controlId },
        update: {
          status: data.status,
          implementationDate: data.implementationDate,
          lastReviewedDate: data.lastReviewedDate || new Date(),
          updatedAt: new Date(),
        },
        create: {
          controlId,
          status: data.status,
          implementationDate: data.implementationDate,
          lastReviewedDate: data.lastReviewedDate || new Date(),
        },
      });

      // Log status change
      if (control.status?.status !== data.status) {
        await prisma.changeHistory.create({
          data: {
            controlId,
            fieldChanged: 'status',
            oldValue: control.status?.status || ControlStatus.NOT_STARTED,
            newValue: data.status,
            changedBy: data.assignedTo || null,
          },
        });
      }

      return updatedStatus;
    } catch (error) {
      logger.error(`Error updating control status:`, error);
      throw error;
    }
  }

  /**
   * Bulk update controls
   */
  async bulkUpdateControls(
    controlIds: number[],
    operation: 'updateStatus' | 'assign',
    data: {
      status?: string;
      assignedTo?: string;
    }
  ) {
    try {
      logger.info(`Performing bulk ${operation} on ${controlIds.length} controls`);

      let result;

      switch (operation) {
        case 'updateStatus':
          if (!data.status) {
            throw new Error('status is required for updateStatus operation');
          }
          result = await prisma.controlStatus.updateMany({
            where: {
              controlId: { in: controlIds },
            },
            data: {
              status: data.status,
              lastReviewedDate: new Date(),
              updatedAt: new Date(),
            },
          });

          // Log changes for each control
          await prisma.changeHistory.createMany({
            data: controlIds.map((id) => ({
              controlId: id,
              fieldChanged: 'status',
              oldValue: null, // We don't track old value in bulk operations for performance
              newValue: data.status!,
              changedBy: data.assignedTo || null,
            })),
          });
          break;

        case 'assign':
          if (!data.assignedTo) {
            throw new Error('assignedTo is required for assign operation');
          }
          result = await prisma.controlStatus.updateMany({
            where: {
              controlId: { in: controlIds },
            },
            data: {
              assignedTo: data.assignedTo,
              updatedAt: new Date(),
            },
          });

          // Log changes for each control
          await prisma.changeHistory.createMany({
            data: controlIds.map((id) => ({
              controlId: id,
              fieldChanged: 'assignedTo',
              oldValue: null,
              newValue: data.assignedTo!,
              changedBy: data.assignedTo || null,
            })),
          });
          break;

        default:
          throw new Error('Invalid bulk operation');
      }

      logger.info(`Bulk operation completed: ${result.count} controls updated`);
      return result;
    } catch (error) {
      logger.error('Error performing bulk update:', error);
      throw error;
    }
  }
}

export const controlService = new ControlService();
