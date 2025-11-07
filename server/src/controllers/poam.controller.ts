import { Request, Response, NextFunction } from 'express';
import { poamService } from '../services/poam.service';
import {
  CreatePoamDto,
  UpdatePoamDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  PoamFilters,
} from '../types/poam.types';

export class PoamController {
  /**
   * GET /api/poams
   */
  async getAllPoams(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: PoamFilters = {
        status: req.query.status as any,
        priority: req.query.priority as any,
        controlId: req.query.controlId
          ? parseInt(req.query.controlId as string)
          : undefined,
        assignedTo: req.query.assignedTo as string,
        overdue: req.query.overdue === 'true',
      };

      const poams = await poamService.getAllPoams(filters);
      res.json(poams);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/poams/:id
   */
  async getPoamById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const poam = await poamService.getPoamById(id);
      res.json(poam);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/poams
   */
  async createPoam(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreatePoamDto = req.body;
      const poam = await poamService.createPoam(data);
      res.status(201).json(poam);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/poams/:id
   */
  async updatePoam(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const data: UpdatePoamDto = req.body;
      const poam = await poamService.updatePoam(id, data);
      res.json(poam);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/poams/:id/status
   */
  async updatePoamStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const poam = await poamService.updatePoamStatus(id, status);
      res.json(poam);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/poams/:id
   */
  async deletePoam(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const result = await poamService.deletePoam(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/poams/stats
   */
  async getPoamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await poamService.getPoamStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/poams/:id/milestones
   */
  async addMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const poamId = parseInt(req.params.id);
      const data: CreateMilestoneDto = req.body;
      const milestone = await poamService.addMilestone(poamId, data);
      res.status(201).json(milestone);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/poams/:poamId/milestones/:milestoneId
   */
  async updateMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const poamId = parseInt(req.params.poamId);
      const milestoneId = parseInt(req.params.milestoneId);
      const data: UpdateMilestoneDto = req.body;
      const milestone = await poamService.updateMilestone(
        poamId,
        milestoneId,
        data
      );
      res.json(milestone);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/poams/:poamId/milestones/:milestoneId/complete
   */
  async completeMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const poamId = parseInt(req.params.poamId);
      const milestoneId = parseInt(req.params.milestoneId);
      const milestone = await poamService.completeMilestone(
        poamId,
        milestoneId
      );
      res.json(milestone);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/poams/:poamId/milestones/:milestoneId
   */
  async deleteMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const poamId = parseInt(req.params.poamId);
      const milestoneId = parseInt(req.params.milestoneId);
      const result = await poamService.deleteMilestone(poamId, milestoneId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const poamController = new PoamController();
