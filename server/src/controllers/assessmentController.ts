// HTTP request handlers for assessment endpoints

import { Request, Response, NextFunction } from 'express';
import { AssessmentService } from '../services/assessmentService';
import { AssessmentCreateDto, AssessmentUpdateDto } from '../types/assessment.types';

export class AssessmentController {
  /**
   * POST /api/assessments
   * Create a new assessment
   */
  public static async createAssessment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data: AssessmentCreateDto = req.body;
      const assessment = await AssessmentService.createAssessment(data);
      res.status(201).json(assessment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/:id
   * Get assessment by ID
   */
  public static async getAssessmentById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const assessment = await AssessmentService.getAssessmentById(id);

      if (!assessment) {
        res.status(404).json({ message: 'Assessment not found' });
        return;
      }

      res.json(assessment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments
   * Get all assessments with optional filters
   */
  public static async getAllAssessments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        controlId: req.query.controlId ? parseInt(req.query.controlId as string) : undefined,
        family: req.query.family as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const assessments = await AssessmentService.getAllAssessments(filters);
      res.json(assessments);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/latest
   * Get latest assessment for each control
   */
  public static async getLatestAssessments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const assessments = await AssessmentService.getLatestAssessments();
      res.json(assessments);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/assessments/:id
   * Update an assessment
   */
  public static async updateAssessment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data: AssessmentUpdateDto = req.body;
      const assessment = await AssessmentService.updateAssessment(id, data);
      res.json(assessment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/assessments/:id
   * Delete an assessment
   */
  public static async deleteAssessment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await AssessmentService.deleteAssessment(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/stats
   * Get assessment statistics
   */
  public static async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await AssessmentService.getAssessmentStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/gaps
   * Get gap analysis
   */
  public static async getGapAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const gaps = await AssessmentService.getGapAnalysis();
      res.json(gaps);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/assessments/compare
   * Compare two assessments by date
   */
  public static async compareAssessments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const oldDate = new Date(req.query.oldDate as string);
      const newDate = new Date(req.query.newDate as string);

      if (isNaN(oldDate.getTime()) || isNaN(newDate.getTime())) {
        res.status(400).json({ message: 'Invalid date parameters' });
        return;
      }

      const comparison = await AssessmentService.compareAssessments(oldDate, newDate);
      res.json(comparison);
    } catch (error) {
      next(error);
    }
  }
}
