import { Request, Response, NextFunction } from 'express';
import { controlService } from '@/services/controlService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { isValidControlStatus } from '@/types/enums';

class ControlController {
  /**
   * GET /api/controls
   * Get all controls with optional filtering and pagination
   */
  async getAllControls(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        family,
        status,
        priority,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await controlService.getAllControls({
        family: family as string,
        status: status as string,
        priority: priority as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        data: result.controls,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getAllControls:', error);
      next(error);
    }
  }

  /**
   * GET /api/controls/:id
   * Get control by database ID
   */
  async getControlById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        throw new AppError('Invalid control ID', 400);
      }

      const control = await controlService.getControlById(id);

      if (!control) {
        throw new AppError('Control not found', 404);
      }

      res.status(200).json({
        success: true,
        data: control,
      });
    } catch (error) {
      logger.error(`Error in getControlById (${req.params.id}):`, error);
      next(error);
    }
  }

  /**
   * GET /api/controls/control/:controlId
   * Get control by control ID (e.g., "03.01.01" for Rev 3)
   */
  async getControlByControlId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { controlId } = req.params;

      const control = await controlService.getControlByControlId(controlId);

      if (!control) {
        throw new AppError(`Control ${controlId} not found`, 404);
      }

      res.status(200).json({
        success: true,
        data: control,
      });
    } catch (error) {
      logger.error(`Error in getControlByControlId (${req.params.controlId}):`, error);
      next(error);
    }
  }

  /**
   * PUT /api/controls/:id
   * Update control (implementation notes, assignedTo, nextReviewDate)
   */
  async updateControl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { implementationNotes, assignedTo, nextReviewDate } = req.body;

      if (isNaN(id)) {
        throw new AppError('Invalid control ID', 400);
      }

      const updatedStatus = await controlService.updateControl(id, {
        implementationNotes,
        assignedTo,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
      });

      res.status(200).json({
        success: true,
        data: updatedStatus,
        message: 'Control updated successfully',
      });
    } catch (error) {
      logger.error(`Error in updateControl (${req.params.id}):`, error);
      next(error);
    }
  }

  /**
   * PATCH /api/controls/:id/status
   * Update control status specifically
   */
  async updateControlStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, implementationDate, lastReviewedDate, assignedTo } = req.body;

      if (isNaN(id)) {
        throw new AppError('Invalid control ID', 400);
      }

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      if (!isValidControlStatus(status)) {
        throw new AppError(
          'Invalid status. Must be one of: Not Started, In Progress, Implemented, Verified',
          400
        );
      }

      const updatedStatus = await controlService.updateControlStatus(id, {
        status,
        implementationDate: implementationDate ? new Date(implementationDate) : undefined,
        lastReviewedDate: lastReviewedDate ? new Date(lastReviewedDate) : undefined,
        assignedTo,
      });

      res.status(200).json({
        success: true,
        data: updatedStatus,
        message: 'Control status updated successfully',
      });
    } catch (error) {
      logger.error(`Error in updateControlStatus (${req.params.id}):`, error);
      next(error);
    }
  }

  /**
   * GET /api/controls/:controlId/policies
   * Get M365 policies mapped to this control with their settings
   */
  async getPoliciesForControl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { controlId } = req.params;

      const policies = await controlService.getPoliciesForControl(controlId);

      res.status(200).json({
        success: true,
        data: policies,
      });
    } catch (error) {
      logger.error(`Error in getPoliciesForControl (${req.params.controlId}):`, error);
      next(error);
    }
  }

  /**
   * POST /api/controls/bulk
   * Bulk operations on controls
   */
  async bulkUpdateControls(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { controlIds, operation, data } = req.body;

      // Validation
      if (!Array.isArray(controlIds) || controlIds.length === 0) {
        throw new AppError('controlIds must be a non-empty array', 400);
      }

      if (!operation) {
        throw new AppError('operation is required', 400);
      }

      if (!['updateStatus', 'assign'].includes(operation)) {
        throw new AppError('Invalid operation. Must be one of: updateStatus, assign', 400);
      }

      if (operation === 'updateStatus' && !data?.status) {
        throw new AppError('status is required for updateStatus operation', 400);
      }

      if (operation === 'assign' && !data?.assignedTo) {
        throw new AppError('assignedTo is required for assign operation', 400);
      }

      const result = await controlService.bulkUpdateControls(controlIds, operation, data);

      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.count} controls`,
        count: result.count,
      });
    } catch (error) {
      logger.error('Error in bulkUpdateControls:', error);
      next(error);
    }
  }
}

export const controlController = new ControlController();
