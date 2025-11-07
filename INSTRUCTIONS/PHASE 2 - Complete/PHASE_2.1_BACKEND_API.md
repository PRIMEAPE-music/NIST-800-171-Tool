# Phase 2.1: Backend API Foundation

## Overview
**Goal:** Build complete backend API for control management and statistics  
**Duration:** 2-3 days  
**Prerequisites:** Phase 1 database setup with Prisma schema

## Objectives
1. ✅ Finalize Prisma schema for controls and related tables
2. ✅ Implement control CRUD operations
3. ✅ Build statistics calculation service
4. ✅ Create comprehensive API endpoints
5. ✅ Add validation and error handling

## Database Schema Requirements

### Primary Tables

#### 1. controls
```prisma
model Control {
  id                Int              @id @default(autoincrement())
  controlId         String           @unique // e.g., "3.1.1"
  family            String           // e.g., "AC"
  title             String
  requirementText   String           @db.Text
  discussionText    String?          @db.Text
  priority          String           @default("Medium") // Critical, High, Medium, Low
  nistRevision      String           @default("r3") // Track revision
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  // Relations
  status            ControlStatus?
  assessments       Assessment[]
  evidence          Evidence[]
  poams             POAM[]
  policyMappings    ControlPolicyMapping[]
  changeHistory     ChangeHistory[]
  
  @@map("controls")
}
```

#### 2. control_status
```prisma
model ControlStatus {
  id                    Int       @id @default(autoincrement())
  controlId             Int       @unique
  status                String    @default("Not Started") // Not Started, In Progress, Implemented, Verified
  implementationDate    DateTime?
  lastReviewedDate      DateTime?
  nextReviewDate        DateTime?
  assignedTo            String?
  implementationNotes   String?   @db.Text
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  control               Control   @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  @@map("control_status")
}
```

#### 3. change_history
```prisma
model ChangeHistory {
  id          Int      @id @default(autoincrement())
  controlId   Int
  fieldName   String   // Which field changed
  oldValue    String?  @db.Text
  newValue    String?  @db.Text
  changedBy   String?  // User identifier
  changedAt   DateTime @default(now())
  
  // Relations
  control     Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  @@map("change_history")
}
```

### Enums (TypeScript)
```typescript
// server/src/types/enums.ts
export enum ControlStatus {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  IMPLEMENTED = "Implemented",
  VERIFIED = "Verified"
}

export enum ControlPriority {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low"
}

export enum ControlFamily {
  AC = "AC",  // Access Control
  AT = "AT",  // Awareness and Training
  AU = "AU",  // Audit and Accountability
  CA = "CA",  // Security Assessment
  CM = "CM",  // Configuration Management
  CP = "CP",  // Contingency Planning
  IA = "IA",  // Identification and Authentication
  IR = "IR",  // Incident Response
  MA = "MA",  // Maintenance
  MP = "MP",  // Media Protection
  PE = "PE",  // Physical Protection
  PS = "PS",  // Personnel Security
  RA = "RA",  // Risk Assessment
  SC = "SC",  // System and Communications Protection
  SI = "SI",  // System and Information Integrity
  SR = "SR"   // Supply Chain Risk Management (NEW in r3)
}
```

## API Endpoints Specification

### Control Endpoints

#### 1. GET /api/controls
**Purpose:** Retrieve all controls with optional filtering

**Query Parameters:**
- `family` (string) - Filter by control family (AC, AT, etc.)
- `status` (string) - Filter by status
- `priority` (string) - Filter by priority
- `search` (string) - Search in title and requirement text
- `page` (number) - Page number for pagination (default: 1)
- `limit` (number) - Items per page (default: 50)
- `sortBy` (string) - Field to sort by (default: controlId)
- `sortOrder` (string) - asc or desc (default: asc)

**Response:**
```typescript
{
  controls: Control[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

**Implementation:**
```typescript
// server/src/controllers/controlController.ts
export async function getControls(req: Request, res: Response) {
  try {
    const {
      family,
      status,
      priority,
      search,
      page = 1,
      limit = 50,
      sortBy = 'controlId',
      sortOrder = 'asc'
    } = req.query;

    // Build where clause
    const where: any = {};
    if (family) where.family = family;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { requirementText: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Handle status filter (requires join)
    if (status) {
      where.status = { status };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Fetch data
    const [controls, total] = await Promise.all([
      prisma.control.findMany({
        where,
        include: {
          status: true,
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 1
          },
          evidence: {
            select: { id: true } // Just count
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take
      }),
      prisma.control.count({ where })
    ]);

    res.json({
      controls,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching controls:', error);
    res.status(500).json({ error: 'Failed to fetch controls' });
  }
}
```

#### 2. GET /api/controls/:id
**Purpose:** Get single control with full details

**Response:**
```typescript
{
  control: Control & {
    status: ControlStatus,
    assessments: Assessment[],
    evidence: Evidence[],
    poams: POAM[],
    changeHistory: ChangeHistory[]
  }
}
```

**Implementation:**
```typescript
export async function getControlById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const control = await prisma.control.findUnique({
      where: { id: Number(id) },
      include: {
        status: true,
        assessments: {
          orderBy: { assessmentDate: 'desc' }
        },
        evidence: true,
        poams: {
          where: {
            status: { not: 'Completed' }
          }
        },
        changeHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20 // Last 20 changes
        }
      }
    });

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json({ control });
  } catch (error) {
    console.error('Error fetching control:', error);
    res.status(500).json({ error: 'Failed to fetch control' });
  }
}
```

#### 3. PUT /api/controls/:id
**Purpose:** Update control (typically for implementation notes)

**Request Body:**
```typescript
{
  implementationNotes?: string,
  assignedTo?: string,
  nextReviewDate?: string
}
```

**Implementation:**
```typescript
export async function updateControl(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { implementationNotes, assignedTo, nextReviewDate } = req.body;

    // Get current status for comparison
    const currentStatus = await prisma.controlStatus.findUnique({
      where: { controlId: Number(id) }
    });

    // Update status
    const updatedStatus = await prisma.controlStatus.update({
      where: { controlId: Number(id) },
      data: {
        implementationNotes,
        assignedTo,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
        updatedAt: new Date()
      }
    });

    // Log changes
    const changes = [];
    if (currentStatus?.implementationNotes !== implementationNotes) {
      changes.push({
        controlId: Number(id),
        fieldName: 'implementationNotes',
        oldValue: currentStatus?.implementationNotes,
        newValue: implementationNotes
      });
    }
    if (currentStatus?.assignedTo !== assignedTo) {
      changes.push({
        controlId: Number(id),
        fieldName: 'assignedTo',
        oldValue: currentStatus?.assignedTo,
        newValue: assignedTo
      });
    }

    if (changes.length > 0) {
      await prisma.changeHistory.createMany({
        data: changes
      });
    }

    res.json({ status: updatedStatus });
  } catch (error) {
    console.error('Error updating control:', error);
    res.status(500).json({ error: 'Failed to update control' });
  }
}
```

#### 4. PATCH /api/controls/:id/status
**Purpose:** Update control status specifically

**Request Body:**
```typescript
{
  status: ControlStatus,
  implementationDate?: string,
  lastReviewedDate?: string
}
```

**Implementation:**
```typescript
export async function updateControlStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, implementationDate, lastReviewedDate } = req.body;

    // Validate status
    if (!Object.values(ControlStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Get current status
    const currentStatus = await prisma.controlStatus.findUnique({
      where: { controlId: Number(id) }
    });

    // Update status
    const updatedStatus = await prisma.controlStatus.update({
      where: { controlId: Number(id) },
      data: {
        status,
        implementationDate: implementationDate ? new Date(implementationDate) : undefined,
        lastReviewedDate: lastReviewedDate ? new Date(lastReviewedDate) : new Date(),
        updatedAt: new Date()
      }
    });

    // Log status change
    if (currentStatus?.status !== status) {
      await prisma.changeHistory.create({
        data: {
          controlId: Number(id),
          fieldName: 'status',
          oldValue: currentStatus?.status,
          newValue: status
        }
      });
    }

    res.json({ status: updatedStatus });
  } catch (error) {
    console.error('Error updating control status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
}
```

#### 5. POST /api/controls/bulk
**Purpose:** Bulk operations (status updates, assignments)

**Request Body:**
```typescript
{
  controlIds: number[],
  operation: 'updateStatus' | 'assign',
  data: {
    status?: string,
    assignedTo?: string
  }
}
```

**Implementation:**
```typescript
export async function bulkUpdateControls(req: Request, res: Response) {
  try {
    const { controlIds, operation, data } = req.body;

    if (!Array.isArray(controlIds) || controlIds.length === 0) {
      return res.status(400).json({ error: 'controlIds must be a non-empty array' });
    }

    let result;

    switch (operation) {
      case 'updateStatus':
        if (!data.status) {
          return res.status(400).json({ error: 'status is required' });
        }
        result = await prisma.controlStatus.updateMany({
          where: {
            controlId: { in: controlIds }
          },
          data: {
            status: data.status,
            lastReviewedDate: new Date(),
            updatedAt: new Date()
          }
        });
        break;

      case 'assign':
        if (!data.assignedTo) {
          return res.status(400).json({ error: 'assignedTo is required' });
        }
        result = await prisma.controlStatus.updateMany({
          where: {
            controlId: { in: controlIds }
          },
          data: {
            assignedTo: data.assignedTo,
            updatedAt: new Date()
          }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    res.json({ 
      message: `Successfully updated ${result.count} controls`,
      count: result.count 
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
}
```

### Statistics Endpoints

#### 6. GET /api/controls/stats
**Purpose:** Get comprehensive compliance statistics

**Response:**
```typescript
{
  overall: {
    total: number,
    byStatus: {
      notStarted: number,
      inProgress: number,
      implemented: number,
      verified: number
    },
    compliancePercentage: number
  },
  byFamily: {
    [family: string]: {
      total: number,
      byStatus: { ... },
      compliancePercentage: number
    }
  },
  byPriority: {
    critical: number,
    high: number,
    medium: number,
    low: number
  },
  recentActivity: ChangeHistory[],
  topGaps: Control[] // Controls not started or in progress with high priority
}
```

**Implementation:**
```typescript
// server/src/services/statisticsService.ts
export class StatisticsService {
  async getComplianceStats() {
    // Get all controls with their status
    const controls = await prisma.control.findMany({
      include: {
        status: true
      }
    });

    const total = controls.length;

    // Calculate overall stats
    const byStatus = {
      notStarted: 0,
      inProgress: 0,
      implemented: 0,
      verified: 0
    };

    controls.forEach(control => {
      const status = control.status?.status || 'Not Started';
      switch (status) {
        case 'Not Started':
          byStatus.notStarted++;
          break;
        case 'In Progress':
          byStatus.inProgress++;
          break;
        case 'Implemented':
          byStatus.implemented++;
          break;
        case 'Verified':
          byStatus.verified++;
          break;
      }
    });

    const compliancePercentage = Math.round(
      ((byStatus.implemented + byStatus.verified) / total) * 100
    );

    // Calculate by family
    const byFamily: any = {};
    const families = [...new Set(controls.map(c => c.family))];
    
    families.forEach(family => {
      const familyControls = controls.filter(c => c.family === family);
      const familyStats = {
        notStarted: 0,
        inProgress: 0,
        implemented: 0,
        verified: 0
      };

      familyControls.forEach(control => {
        const status = control.status?.status || 'Not Started';
        switch (status) {
          case 'Not Started':
            familyStats.notStarted++;
            break;
          case 'In Progress':
            familyStats.inProgress++;
            break;
          case 'Implemented':
            familyStats.implemented++;
            break;
          case 'Verified':
            familyStats.verified++;
            break;
        }
      });

      const familyCompliance = Math.round(
        ((familyStats.implemented + familyStats.verified) / familyControls.length) * 100
      );

      byFamily[family] = {
        total: familyControls.length,
        byStatus: familyStats,
        compliancePercentage: familyCompliance
      };
    });

    // Calculate by priority
    const byPriority = {
      critical: controls.filter(c => c.priority === 'Critical').length,
      high: controls.filter(c => c.priority === 'High').length,
      medium: controls.filter(c => c.priority === 'Medium').length,
      low: controls.filter(c => c.priority === 'Low').length
    };

    // Get recent activity
    const recentActivity = await prisma.changeHistory.findMany({
      orderBy: { changedAt: 'desc' },
      take: 10,
      include: {
        control: {
          select: {
            controlId: true,
            title: true
          }
        }
      }
    });

    // Get top gaps (high priority, not implemented)
    const topGaps = controls
      .filter(c => {
        const status = c.status?.status || 'Not Started';
        return (status === 'Not Started' || status === 'In Progress') &&
               (c.priority === 'Critical' || c.priority === 'High');
      })
      .sort((a, b) => {
        const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] -
               priorityOrder[b.priority as keyof typeof priorityOrder];
      })
      .slice(0, 10);

    return {
      overall: {
        total,
        byStatus,
        compliancePercentage
      },
      byFamily,
      byPriority,
      recentActivity,
      topGaps
    };
  }
}

// Controller
export async function getStatistics(req: Request, res: Response) {
  try {
    const statsService = new StatisticsService();
    const stats = await statsService.getComplianceStats();
    res.json(stats);
  } catch (error) {
    console.error('Error calculating statistics:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
}
```

## Route Configuration

```typescript
// server/src/routes/controlRoutes.ts
import express from 'express';
import {
  getControls,
  getControlById,
  updateControl,
  updateControlStatus,
  bulkUpdateControls
} from '../controllers/controlController';
import { getStatistics } from '../controllers/statsController';

const router = express.Router();

// Statistics must come before :id route
router.get('/stats', getStatistics);

// Control routes
router.get('/', getControls);
router.get('/:id', getControlById);
router.put('/:id', updateControl);
router.patch('/:id/status', updateControlStatus);
router.post('/bulk', bulkUpdateControls);

export default router;
```

## Validation Schemas

```typescript
// server/src/validation/controlSchemas.ts
import { z } from 'zod';

export const updateControlSchema = z.object({
  implementationNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  nextReviewDate: z.string().datetime().optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['Not Started', 'In Progress', 'Implemented', 'Verified']),
  implementationDate: z.string().datetime().optional(),
  lastReviewedDate: z.string().datetime().optional()
});

export const bulkUpdateSchema = z.object({
  controlIds: z.array(z.number()).min(1),
  operation: z.enum(['updateStatus', 'assign']),
  data: z.object({
    status: z.string().optional(),
    assignedTo: z.string().optional()
  })
});
```

## Error Handling Middleware

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: err.statusCode
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    status: 500
  });
}
```

## Testing Checklist

### Unit Tests
- [ ] Control CRUD operations
- [ ] Statistics calculations
- [ ] Bulk operations
- [ ] Validation schemas

### Integration Tests
- [ ] GET /api/controls with various filters
- [ ] GET /api/controls/:id
- [ ] PUT /api/controls/:id
- [ ] PATCH /api/controls/:id/status
- [ ] POST /api/controls/bulk
- [ ] GET /api/controls/stats

### Edge Cases
- [ ] Invalid control ID
- [ ] Invalid status values
- [ ] Empty bulk operations
- [ ] Missing required fields
- [ ] Database connection failures

## Next Steps
After completing Phase 2.1, proceed to **PHASE_2.2_CONTROL_LIBRARY.md** to build the frontend UI.
