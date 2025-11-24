import { Request, Response, NextFunction } from 'express';
import { gapAnalysisService } from '@/services/gapAnalysis.service';
import { poamService } from '@/services/poam.service';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

class GapController {
  /**
   * GET /api/gaps/analysis
   * Get overall gap analysis for dashboard
   */
  async getGapAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analysis = await gapAnalysisService.getOverallGapSummary();
      res.status(200).json({
        success: true,
        analysis,
      });
    } catch (error) {
      logger.error('Error in getGapAnalysis:', error);
      next(error);
    }
  }

  /**
   * GET /api/gaps/control/:controlId
   * Get gap analysis for a specific control
   */
  async getControlGapAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { controlId } = req.params;
      const analysis = await gapAnalysisService.getControlGapAnalysis(controlId);

      if (!analysis) {
        throw new AppError('Control not found', 404);
      }

      res.status(200).json(analysis);
    } catch (error) {
      logger.error(`Error in getControlGapAnalysis (${req.params.controlId}):`, error);
      next(error);
    }
  }

  /**
   * PATCH /api/gaps/:gapId
   * Update gap status
   */
  async updateGapStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gapId = parseInt(req.params.gapId, 10);
      const { status, assignedTo, notes } = req.body;

      if (isNaN(gapId)) {
        throw new AppError('Invalid gap ID', 400);
      }

      const updatedGap = await gapAnalysisService.updateGapStatus(gapId, {
        status,
        assignedTo,
        notes,
      });

      res.status(200).json({
        success: true,
        data: updatedGap,
      });
    } catch (error) {
      logger.error(`Error in updateGapStatus (${req.params.gapId}):`, error);
      next(error);
    }
  }

  /**
   * POST /api/gaps/:gapId/poam
   * Create a POA&M item from a gap
   */
  async createPoamFromGap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gapId = parseInt(req.params.gapId, 10);

      if (isNaN(gapId)) {
        throw new AppError('Invalid gap ID', 400);
      }

      // 1. Get the gap details
      const gap = await prisma.controlGap.findUnique({
        where: { id: gapId },
        include: { control: true },
      });

      if (!gap) {
        throw new AppError('Gap not found', 404);
      }

      // 2. Check if POAM already exists for this gap
      const existingPoam = await prisma.pOAMItem.findUnique({
        where: { gapId },
      });

      if (existingPoam) {
        throw new AppError('POA&M item already exists for this gap', 409);
      }

      // 3. Create POAM using poamService
      const poam = await poamService.createPoam({
        controlId: gap.controlId,
        gapId: gap.id,
        weakness: gap.gapTitle,
        riskLevel: gap.severity,
        likelihood: 'medium', // Default
        impact: 'medium', // Default
        remediationPlan: gap.remediationGuidance || 'To be determined',
        responsibleParty: gap.assignedTo || 'Unassigned',
        milestones: JSON.stringify([]),
        status: 'open',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days default
        sourceOfFinding: 'gap_analysis',
      });

      // 4. Update gap status to in_progress
      await gapAnalysisService.updateGapStatus(gapId, {
        status: 'in_progress',
      });

      res.status(201).json({
        success: true,
        data: poam,
        message: 'POA&M item created successfully',
      });
    } catch (error) {
      logger.error(`Error in createPoamFromGap (${req.params.gapId}):`, error);
      next(error);
    }
  }
}

export const gapController = new GapController();
