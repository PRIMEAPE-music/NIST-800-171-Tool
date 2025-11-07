# Phase 4 Part 2: Backend API Implementation

## Objective
Create RESTful API endpoints for POAM and milestone management with proper validation, error handling, and business logic.

## Architecture Pattern
Follow the existing pattern: **Routes → Controllers → Services → Prisma**

---

## Step 1: POAM Service Layer

📁 `/server/src/services/poam.service.ts`

🔄 **CREATE NEW FILE:**

```typescript
import { PrismaClient, Poam, PoamMilestone } from '@prisma/client';
import {
  CreatePoamDto,
  UpdatePoamDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  PoamFilters,
  PoamStats,
  PoamStatus,
  PoamPriority,
} from '../types/poam.types';

const prisma = new PrismaClient();

export class PoamService {
  /**
   * Get all POAMs with optional filtering
   */
  async getAllPoams(filters?: PoamFilters) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.controlId) {
      where.controlId = filters.controlId;
    }

    if (filters?.assignedTo) {
      where.assignedTo = {
        contains: filters.assignedTo,
        mode: 'insensitive',
      };
    }

    if (filters?.overdue) {
      where.targetCompletionDate = {
        lt: new Date(),
      };
      where.status = {
        not: PoamStatus.COMPLETED,
      };
    }

    const poams = await prisma.poam.findMany({
      where,
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            title: true,
            family: true,
          },
        },
        milestones: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return poams;
  }

  /**
   * Get single POAM by ID
   */
  async getPoamById(id: number) {
    const poam = await prisma.poam.findUnique({
      where: { id },
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            title: true,
            family: true,
            requirementText: true,
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!poam) {
      throw new Error('POAM not found');
    }

    return poam;
  }

  /**
   * Create new POAM
   */
  async createPoam(data: CreatePoamDto) {
    // Validate control exists
    const control = await prisma.control.findUnique({
      where: { id: data.controlId },
    });

    if (!control) {
      throw new Error('Control not found');
    }

    // Validate dates
    if (data.startDate && data.targetCompletionDate) {
      const start = new Date(data.startDate);
      const target = new Date(data.targetCompletionDate);
      if (start > target) {
        throw new Error('Start date cannot be after target completion date');
      }
    }

    const poam = await prisma.poam.create({
      data: {
        controlId: data.controlId,
        gapDescription: data.gapDescription,
        remediationPlan: data.remediationPlan,
        assignedTo: data.assignedTo,
        priority: data.priority || PoamPriority.MEDIUM,
        status: data.status || PoamStatus.OPEN,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetCompletionDate: data.targetCompletionDate
          ? new Date(data.targetCompletionDate)
          : undefined,
        resourcesRequired: data.resourcesRequired,
        budgetEstimate: data.budgetEstimate,
      },
      include: {
        control: true,
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Update POAM
   */
  async updatePoam(id: number, data: UpdatePoamDto) {
    // Check if POAM exists
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    // Validate status transition
    if (data.status) {
      this.validateStatusTransition(existing.status, data.status);
    }

    // If marking as completed, ensure actualCompletionDate is set
    if (data.status === PoamStatus.COMPLETED && !data.actualCompletionDate) {
      data.actualCompletionDate = new Date().toISOString();
    }

    // Validate dates
    if (data.startDate && data.targetCompletionDate) {
      const start = new Date(data.startDate);
      const target = new Date(data.targetCompletionDate);
      if (start > target) {
        throw new Error('Start date cannot be after target completion date');
      }
    }

    const poam = await prisma.poam.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetCompletionDate: data.targetCompletionDate
          ? new Date(data.targetCompletionDate)
          : undefined,
        actualCompletionDate: data.actualCompletionDate
          ? new Date(data.actualCompletionDate)
          : undefined,
      },
      include: {
        control: true,
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Update POAM status only
   */
  async updatePoamStatus(id: number, status: PoamStatus) {
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    this.validateStatusTransition(existing.status, status);

    const updateData: any = { status };

    // Auto-set completion date when marking as completed
    if (status === PoamStatus.COMPLETED && !existing.actualCompletionDate) {
      updateData.actualCompletionDate = new Date();
    }

    const poam = await prisma.poam.update({
      where: { id },
      data: updateData,
      include: {
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Delete POAM (cascades to milestones)
   */
  async deletePoam(id: number) {
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    await prisma.poam.delete({
      where: { id },
    });

    return { message: 'POAM deleted successfully' };
  }

  /**
   * Add milestone to POAM
   */
  async addMilestone(poamId: number, data: CreateMilestoneDto) {
    // Validate POAM exists
    const poam = await prisma.poam.findUnique({ where: { id: poamId } });
    if (!poam) {
      throw new Error('POAM not found');
    }

    // Validate milestone due date is before or equal to POAM target date
    if (poam.targetCompletionDate) {
      const milestoneDue = new Date(data.dueDate);
      if (milestoneDue > poam.targetCompletionDate) {
        throw new Error(
          'Milestone due date cannot be after POAM target completion date'
        );
      }
    }

    const milestone = await prisma.poamMilestone.create({
      data: {
        poamId,
        milestoneDescription: data.milestoneDescription,
        dueDate: new Date(data.dueDate),
        status: data.status || 'Pending',
        notes: data.notes,
      },
    });

    return milestone;
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    poamId: number,
    milestoneId: number,
    data: UpdateMilestoneDto
  ) {
    // Validate milestone belongs to POAM
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
      include: { poam: true },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Auto-set completion date if marking as completed
    if (data.status === 'Completed' && !data.completionDate) {
      data.completionDate = new Date().toISOString();
    }

    // Validate due date against POAM target date
    if (data.dueDate && milestone.poam.targetCompletionDate) {
      const newDueDate = new Date(data.dueDate);
      if (newDueDate > milestone.poam.targetCompletionDate) {
        throw new Error(
          'Milestone due date cannot be after POAM target completion date'
        );
      }
    }

    const updated = await prisma.poamMilestone.update({
      where: { id: milestoneId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completionDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,
      },
    });

    return updated;
  }

  /**
   * Mark milestone as complete
   */
  async completeMilestone(poamId: number, milestoneId: number) {
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const updated = await prisma.poamMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'Completed',
        completionDate: new Date(),
      },
    });

    return updated;
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(poamId: number, milestoneId: number) {
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    await prisma.poamMilestone.delete({
      where: { id: milestoneId },
    });

    return { message: 'Milestone deleted successfully' };
  }

  /**
   * Get POAM statistics
   */
  async getPoamStats(): Promise<PoamStats> {
    const allPoams = await prisma.poam.findMany();

    const stats: PoamStats = {
      total: allPoams.length,
      byStatus: {
        [PoamStatus.OPEN]: 0,
        [PoamStatus.IN_PROGRESS]: 0,
        [PoamStatus.COMPLETED]: 0,
        [PoamStatus.RISK_ACCEPTED]: 0,
      },
      byPriority: {
        [PoamPriority.HIGH]: 0,
        [PoamPriority.MEDIUM]: 0,
        [PoamPriority.LOW]: 0,
      },
      overdue: 0,
      completedThisMonth: 0,
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    allPoams.forEach((poam) => {
      // Count by status
      stats.byStatus[poam.status as PoamStatus]++;

      // Count by priority
      stats.byPriority[poam.priority as PoamPriority]++;

      // Count overdue
      if (
        poam.targetCompletionDate &&
        poam.targetCompletionDate < now &&
        poam.status !== PoamStatus.COMPLETED
      ) {
        stats.overdue++;
      }

      // Count completed this month
      if (
        poam.actualCompletionDate &&
        poam.actualCompletionDate >= startOfMonth
      ) {
        stats.completedThisMonth++;
      }
    });

    return stats;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      [PoamStatus.OPEN]: [
        PoamStatus.IN_PROGRESS,
        PoamStatus.RISK_ACCEPTED,
        PoamStatus.COMPLETED,
      ],
      [PoamStatus.IN_PROGRESS]: [
        PoamStatus.COMPLETED,
        PoamStatus.RISK_ACCEPTED,
        PoamStatus.OPEN,
      ],
      [PoamStatus.COMPLETED]: [PoamStatus.IN_PROGRESS], // Allow reopening
      [PoamStatus.RISK_ACCEPTED]: [PoamStatus.OPEN, PoamStatus.IN_PROGRESS],
    };

    if (
      currentStatus !== newStatus &&
      !validTransitions[currentStatus]?.includes(newStatus)
    ) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}

export const poamService = new PoamService();
```

---

## Step 2: POAM Controller

📁 `/server/src/controllers/poam.controller.ts`

🔄 **CREATE NEW FILE:**

```typescript
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
```

---

## Step 3: Validation Middleware (Optional but Recommended)

📁 `/server/src/middleware/poam.validation.ts`

🔄 **CREATE NEW FILE:**

```typescript
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
```

---

## Step 4: Routes

📁 `/server/src/routes/poam.routes.ts`

🔄 **CREATE NEW FILE:**

```typescript
import { Router } from 'express';
import { poamController } from '../controllers/poam.controller';
import {
  validateCreatePoam,
  validateUpdatePoam,
  validateCreateMilestone,
  validateUpdateMilestone,
} from '../middleware/poam.validation';

const router = Router();

// POAM routes
router.get('/stats', poamController.getPoamStats.bind(poamController));
router.get('/', poamController.getAllPoams.bind(poamController));
router.get('/:id', poamController.getPoamById.bind(poamController));
router.post(
  '/',
  validateCreatePoam,
  poamController.createPoam.bind(poamController)
);
router.put(
  '/:id',
  validateUpdatePoam,
  poamController.updatePoam.bind(poamController)
);
router.patch(
  '/:id/status',
  poamController.updatePoamStatus.bind(poamController)
);
router.delete('/:id', poamController.deletePoam.bind(poamController));

// Milestone routes
router.post(
  '/:id/milestones',
  validateCreateMilestone,
  poamController.addMilestone.bind(poamController)
);
router.put(
  '/:poamId/milestones/:milestoneId',
  validateUpdateMilestone,
  poamController.updateMilestone.bind(poamController)
);
router.patch(
  '/:poamId/milestones/:milestoneId/complete',
  poamController.completeMilestone.bind(poamController)
);
router.delete(
  '/:poamId/milestones/:milestoneId',
  poamController.deleteMilestone.bind(poamController)
);

export default router;
```

---

## Step 5: Register Routes in Main App

📁 `/server/src/app.ts` or `/server/src/index.ts`

🔍 **FIND:**
```typescript
// Existing route imports
import controlRoutes from './routes/control.routes';
// ... other routes

// Route registration
app.use('/api/controls', controlRoutes);
// ... other routes
```

✏️ **ADD AFTER existing route imports:**
```typescript
import poamRoutes from './routes/poam.routes';
```

✏️ **ADD AFTER existing route registrations:**
```typescript
app.use('/api/poams', poamRoutes);
```

---

## Step 6: Test Endpoints with REST Client

Create a test file for API testing:

📁 `/server/tests/poam.http` (or use Postman)

```http
### Get all POAMs
GET http://localhost:3001/api/poams

### Get POAMs filtered by status
GET http://localhost:3001/api/poams?status=In Progress

### Get POAMs for specific control
GET http://localhost:3001/api/poams?controlId=1

### Get overdue POAMs
GET http://localhost:3001/api/poams?overdue=true

### Get POAM by ID
GET http://localhost:3001/api/poams/1

### Create new POAM
POST http://localhost:3001/api/poams
Content-Type: application/json

{
  "controlId": 1,
  "gapDescription": "Multi-factor authentication is not enforced for all users",
  "remediationPlan": "Deploy MFA policies via Azure AD conditional access",
  "assignedTo": "IT Security Team",
  "priority": "High",
  "targetCompletionDate": "2025-01-31T00:00:00Z",
  "resourcesRequired": "Azure AD Premium licenses",
  "budgetEstimate": 5000
}

### Update POAM
PUT http://localhost:3001/api/poams/1
Content-Type: application/json

{
  "status": "In Progress",
  "startDate": "2024-11-10T00:00:00Z"
}

### Update POAM status only
PATCH http://localhost:3001/api/poams/1/status
Content-Type: application/json

{
  "status": "Completed"
}

### Delete POAM
DELETE http://localhost:3001/api/poams/1

### Add milestone to POAM
POST http://localhost:3001/api/poams/1/milestones
Content-Type: application/json

{
  "milestoneDescription": "Purchase Azure AD Premium licenses",
  "dueDate": "2024-12-01T00:00:00Z"
}

### Update milestone
PUT http://localhost:3001/api/poams/1/milestones/1
Content-Type: application/json

{
  "status": "Completed",
  "completionDate": "2024-11-25T00:00:00Z"
}

### Complete milestone
PATCH http://localhost:3001/api/poams/1/milestones/1/complete

### Delete milestone
DELETE http://localhost:3001/api/poams/1/milestones/1

### Get POAM statistics
GET http://localhost:3001/api/poams/stats
```

---

## Step 7: Error Handling Middleware

Ensure your Express app has proper error handling:

📁 `/server/src/middleware/error.middleware.ts`

If this doesn't exist, create it:

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);

  // Handle specific error types
  if (error.message.includes('not found')) {
    return res.status(404).json({
      error: error.message,
    });
  }

  if (error.message.includes('Invalid status transition')) {
    return res.status(400).json({
      error: error.message,
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
}
```

Register in app:

🔍 **FIND in app.ts:**
```typescript
// Routes
app.use('/api/controls', controlRoutes);
app.use('/api/poams', poamRoutes);
```

✏️ **ADD AFTER routes:**
```typescript
// Error handling (must be last)
app.use(errorHandler);
```

---

## Completion Checklist

- [ ] Service layer created with all CRUD operations
- [ ] Controller created with request handling
- [ ] Validation middleware implemented
- [ ] Routes configured and registered
- [ ] Error handling middleware in place
- [ ] API endpoints tested with REST client
- [ ] Status transitions validated
- [ ] Date validations working
- [ ] Milestone cascade operations tested

---

## Common Issues & Solutions

### Issue: "Poam not found" on valid ID
**Solution:** Check that Prisma Client is regenerated after schema changes

### Issue: Validation errors not showing details
**Solution:** Ensure Zod validation middleware catches ZodError properly

### Issue: Dates not parsing correctly
**Solution:** Ensure ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

---

## Next Steps
Proceed to **03-FRONTEND-COMPONENTS.md** to build the React UI components.
