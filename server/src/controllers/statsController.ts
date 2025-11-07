import { Request, Response, NextFunction } from 'express';
import { statisticsService } from '@/services/statisticsService';
import { logger } from '@/utils/logger';
import { ControlFamily, isValidControlFamily } from '@/types/enums';

/**
 * Statistics Controller
 * Handles all statistics and reporting endpoints
 */
class StatsController {
  /**
   * GET /api/controls/stats
   * Get comprehensive compliance statistics
   */
  async getComplianceStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Fetching compliance statistics');
      const stats = await statisticsService.getComplianceStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching compliance statistics:', error);
      next(error);
    }
  }

  /**
   * GET /api/controls/stats/family/:family
   * Get statistics for a specific control family
   */
  async getFamilyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { family } = req.params;

      if (!isValidControlFamily(family)) {
        res.status(400).json({
          success: false,
          error: `Invalid control family: ${family}`,
        });
        return;
      }

      logger.info(`Fetching statistics for family: ${family}`);
      const stats = await statisticsService.getFamilyStats(family as ControlFamily);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error(`Error fetching family statistics for ${req.params.family}:`, error);
      next(error);
    }
  }

  /**
   * GET /api/controls/stats/progress
   * Get compliance progress over time
   */
  async getProgressOverTime(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Fetching progress over time');
      const progress = await statisticsService.getProgressOverTime();

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      logger.error('Error fetching progress over time:', error);
      next(error);
    }
  }

  /**
   * GET /api/controls/stats/summary
   * Get summary statistics for dashboard cards
   */
  async getSummaryStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Fetching summary statistics');
      const summary = await statisticsService.getSummaryStats();

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error fetching summary statistics:', error);
      next(error);
    }
  }
}

export const statsController = new StatsController();
