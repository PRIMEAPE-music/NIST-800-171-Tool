import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const createPoamSchema = z.object({
  controlId: z.number().int().positive(),
  gapDescription: z.string().min(10, 'Gap description must be at least 10 characters'),
  remediationPlan: z.string().min(20, 'Remediation plan must be at least 20 characters'),
  assignedTo: z.string().optional(),
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  status: z.enum(['Open', 'In Progress', 'Completed', 'Risk Accepted']).optional(),
  startDate: z.string().datetime().optional(),
  targetCompletionDate: z.string().datetime().optional(),
  resourcesRequired: z.string().optional(),
  budgetEstimate: z.number().positive().optional(),
});

const updatePoamSchema = createPoamSchema.partial().omit({ controlId: true });

const createMilestoneSchema = z.object({
  milestoneDescription: z.string().min(5, 'Milestone description must be at least 5 characters'),
  dueDate: z.string().datetime(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  notes: z.string().optional(),
});

const updateMilestoneSchema = createMilestoneSchema.partial();

export function validateCreatePoam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    createPoamSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
}

export function validateUpdatePoam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    updatePoamSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
}

export function validateCreateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    createMilestoneSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
}

export function validateUpdateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    updateMilestoneSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
}
