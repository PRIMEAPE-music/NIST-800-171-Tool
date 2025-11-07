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
