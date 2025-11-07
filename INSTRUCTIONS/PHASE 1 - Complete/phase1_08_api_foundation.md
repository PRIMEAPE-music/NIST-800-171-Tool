# Phase 1.8: API Foundation

## Objective
Set up Express routing structure, create controller pattern, implement basic CRUD endpoints for controls, and establish API testing procedures.

**Duration:** 3-4 hours  
**Prerequisites:** Phase 1.6 complete  
**Dependencies:** Express, Prisma Client

---

## Tasks Overview

1. ✅ Create Express routing structure
2. ✅ Implement controller pattern
3. ✅ Create control CRUD endpoints
4. ✅ Add request validation middleware
5. ✅ Create response formatting utilities
6. ✅ Test API endpoints

---

## Step-by-Step Instructions

### Step 1: Create Route Index

📁 **File:** `server/src/routes/index.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { Router } from 'express';
import { controlRoutes } from './controlRoutes';

const router = Router();

// API routes
router.use('/controls', controlRoutes);

// Future routes will be added here:
// router.use('/assessments', assessmentRoutes);
// router.use('/poams', poamRoutes);
// router.use('/evidence', evidenceRoutes);
// router.use('/m365', m365Routes);
// router.use('/reports', reportRoutes);
// router.use('/settings', settingsRoutes);

export default router;
```

---

### Step 2: Create Control Routes

📁 **File:** `server/src/routes/controlRoutes.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { Router } from 'express';
import { controlController } from '@/controllers/controlController';

const router = Router();

// GET /api/controls - Get all controls (with optional filters)
router.get('/', controlController.getAllControls);

// GET /api/controls/stats - Get compliance statistics
router.get('/stats', controlController.getStats);

// GET /api/controls/:id - Get control by database ID
router.get('/:id', controlController.getControlById);

// GET /api/controls/control/:controlId - Get control by control ID (e.g., "03.01.01" for Rev 3)
router.get('/control/:controlId', controlController.getControlByControlId);

// PUT /api/controls/:id/status - Update control status
router.put('/:id/status', controlController.updateControlStatus);

export const controlRoutes = router;
```

---

### Step 3: Create Control Controller

📁 **File:** `server/src/controllers/controlController.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { controlService } from '@/services/controlService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

class ControlController {
  /**
   * GET /api/controls
   * Get all controls with optional filtering
   */
  async getAllControls(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { family, status, priority, search } = req.query;

      const controls = await controlService.getAllControls({
        family: family as string,
        status: status as string,
        priority: priority as string,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: controls,
        count: controls.length,
      });
    } catch (error) {
      logger.error('Error in getAllControls:', error);
      next(error);
    }
  }

  /**
   * GET /api/controls/stats
   * Get compliance statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await controlService.getComplianceStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStats:', error);
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
   * PUT /api/controls/:id/status
   * Update control implementation status
   */
  async updateControlStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, implementationNotes, assignedTo } = req.body;

      if (isNaN(id)) {
        throw new AppError('Invalid control ID', 400);
      }

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      const validStatuses = ['Not Started', 'In Progress', 'Implemented', 'Verified'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      const updatedStatus = await controlService.updateControlStatus(id, {
        status,
        implementationNotes,
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
}

export const controlController = new ControlController();
```

---

### Step 4: Update Control Service

📁 **File:** `server/src/services/controlService.ts`

🔍 **FIND:** (at the end of the file, before export)

➕ **ADD BEFORE:** `export const controlService = new ControlService();`

```typescript
  /**
   * Update control status
   */
  async updateControlStatus(
    controlId: number,
    data: {
      status: string;
      implementationNotes?: string;
      assignedTo?: string;
    }
  ) {
    try {
      // Check if control exists
      const control = await prisma.control.findUnique({
        where: { id: controlId },
      });

      if (!control) {
        throw new Error('Control not found');
      }

      // Update or create control status
      const updatedStatus = await prisma.controlStatus.upsert({
        where: { controlId },
        update: {
          status: data.status,
          implementationNotes: data.implementationNotes || null,
          assignedTo: data.assignedTo || null,
          ...(data.status === 'Implemented' && {
            implementationDate: new Date(),
          }),
          lastReviewedDate: new Date(),
        },
        create: {
          controlId,
          status: data.status,
          implementationNotes: data.implementationNotes || null,
          assignedTo: data.assignedTo || null,
          ...(data.status === 'Implemented' && {
            implementationDate: new Date(),
          }),
        },
      });

      // Log change in history
      await prisma.changeHistory.create({
        data: {
          controlId,
          fieldChanged: 'status',
          oldValue: control.status?.status || 'Not Started',
          newValue: data.status,
          changedBy: data.assignedTo || 'System',
        },
      });

      return updatedStatus;
    } catch (error) {
      logger.error(`Error updating control status:`, error);
      throw error;
    }
  }
```

---

### Step 5: Update Express App with API Routes

📁 **File:** `server/src/app.ts`

🔍 **FIND:**
```typescript
// API routes will be added here
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'NIST 800-171 Compliance Tracker API',
    version: '1.0.0',
  });
});
```

✏️ **REPLACE WITH:**
```typescript
import apiRoutes from '@/routes';

// API root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'NIST 800-171 Compliance Tracker API',
    version: '1.0.0',
    endpoints: {
      controls: '/api/controls',
      health: '/health',
    },
  });
});

// API routes
app.use('/api', apiRoutes);
```

---

### Step 6: Create API Test Script

📁 **File:** `server/test-api.sh`

🔄 **COMPLETE REWRITE:**
```bash
#!/bin/bash

API_URL="http://localhost:3001/api"

echo "🧪 Testing NIST 800-171 Compliance Tracker API"
echo "================================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s "$API_URL/../health" | jq .
echo ""

# Test 2: API Root
echo "2️⃣  Testing API Root..."
curl -s "$API_URL" | jq .
echo ""

# Test 3: Get All Controls
echo "3️⃣  Testing GET /controls (first 3)..."
curl -s "$API_URL/controls" | jq '.data[0:3]'
echo ""

# Test 4: Get Controls Count
echo "4️⃣  Testing GET /controls (count)..."
curl -s "$API_URL/controls" | jq '.count'
echo ""

# Test 5: Get Compliance Stats
echo "5️⃣  Testing GET /controls/stats..."
curl -s "$API_URL/controls/stats" | jq .
echo ""

# Test 6: Get Control by Control ID (Rev 3 format)
echo "6️⃣  Testing GET /controls/control/03.01.01..."
curl -s "$API_URL/controls/control/03.01.01" | jq '.data | {controlId, title, family, status}'
echo ""

# Test 7: Filter Controls by Family
echo "7️⃣  Testing GET /controls?family=AC..."
curl -s "$API_URL/controls?family=AC" | jq '.count'
echo ""

# Test 8: Filter Controls by Priority
echo "8️⃣  Testing GET /controls?priority=Critical..."
curl -s "$API_URL/controls?priority=Critical" | jq '.count'
echo ""

# Test 9: Search Controls
echo "9️⃣  Testing GET /controls?search=authentication..."
curl -s "$API_URL/controls?search=authentication" | jq '.count'
echo ""

# Test 10: Update Control Status
echo "🔟 Testing PUT /controls/1/status..."
curl -s -X PUT "$API_URL/controls/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress",
    "implementationNotes": "Initial configuration started",
    "assignedTo": "Admin User"
  }' | jq .
echo ""

echo "✅ API testing complete!"
```

Make executable:
```bash
chmod +x server/test-api.sh
```

---

## Verification Steps

### 1. Start Backend Server

```bash
cd server
npm run dev
```

**Expected:** Server running on port 3001

### 2. Run API Test Script

```bash
cd server
./test-api.sh
```

**Expected:** All 10 tests pass with proper responses

### 3. Manual Testing with curl

```bash
# Get all controls
curl http://localhost:3001/api/controls | jq .

# Get compliance stats
curl http://localhost:3001/api/controls/stats | jq .

# Get specific control (Rev 3 format)
curl http://localhost:3001/api/controls/control/03.01.01 | jq .

# Update control status
curl -X PUT http://localhost:3001/api/controls/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "In Progress"}' | jq .
```

### 4. Test Error Handling

```bash
# Test 404 - Control not found
curl http://localhost:3001/api/controls/999999 | jq .

# Test 400 - Invalid status
curl -X PUT http://localhost:3001/api/controls/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "InvalidStatus"}' | jq .
```

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 110,
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "stack": "Stack trace (dev only)"
  }
}
```

---

## Next Steps

✅ **Phase 1.8 Complete!**

Proceed to **[Phase 1.9: Environment Configuration](./phase1_09_environment_config.md)**

---

## Checklist

- [ ] Express routing structure created
- [ ] Control routes defined
- [ ] Control controller implemented
- [ ] Control service updated with update method
- [ ] API routes integrated into Express app
- [ ] Error handling works correctly
- [ ] Response formatting consistent
- [ ] Test script created and passes
- [ ] All CRUD endpoints functional
- [ ] Status validation working
- [ ] Change history tracking implemented

---

**Status:** Ready for Phase 1.9  
**Estimated Time:** 3-4 hours  
**Last Updated:** 2025-11-06
