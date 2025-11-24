import { Router } from 'express';
import { gapController } from '@/controllers/gap.controller';

const router = Router();

// GET /api/gaps/analysis - Get overall gap analysis for dashboard
router.get('/analysis', gapController.getGapAnalysis);

// GET /api/gaps/control/:controlId - Get gap analysis for a specific control
router.get('/control/:controlId', gapController.getControlGapAnalysis);

// PATCH /api/gaps/:gapId - Update gap status
router.patch('/:gapId', gapController.updateGapStatus);

// POST /api/gaps/:gapId/poam - Create a POA&M item from a gap
router.post('/:gapId/poam', gapController.createPoamFromGap);

export const gapRoutes = router;
