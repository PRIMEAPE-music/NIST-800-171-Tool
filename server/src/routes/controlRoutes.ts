import { Router } from 'express';
import { controlController } from '@/controllers/controlController';
import { statsController } from '@/controllers/statsController';

const router = Router();

// ============================================================================
// Statistics Routes (must come before :id routes to avoid conflicts)
// ============================================================================

// GET /api/controls/stats - Get comprehensive compliance statistics
router.get('/stats', statsController.getComplianceStats);

// GET /api/controls/stats/family/:family - Get statistics for a specific family
router.get('/stats/family/:family', statsController.getFamilyStats);

// GET /api/controls/stats/progress - Get compliance progress over time
router.get('/stats/progress', statsController.getProgressOverTime);

// GET /api/controls/stats/summary - Get summary statistics for dashboard
router.get('/stats/summary', statsController.getSummaryStats);

// ============================================================================
// Control Routes
// ============================================================================

// GET /api/controls - Get all controls with filtering and pagination
router.get('/', controlController.getAllControls);

// POST /api/controls/bulk - Bulk operations on controls
router.post('/bulk', controlController.bulkUpdateControls);

// GET /api/controls/control/:controlId - Get control by control ID (e.g., "03.01.01")
router.get('/control/:controlId', controlController.getControlByControlId);

// GET /api/controls/:id - Get control by database ID
router.get('/:id', controlController.getControlById);

// GET /api/controls/:controlId/policies - Get M365 policies mapped to this control
router.get('/:controlId/policies', controlController.getPoliciesForControl);

// PUT /api/controls/:id - Update control (notes, assignedTo, nextReviewDate)
router.put('/:id', controlController.updateControl);

// PATCH /api/controls/:id/status - Update control status specifically
router.patch('/:id/status', controlController.updateControlStatus);

export const controlRoutes = router;
