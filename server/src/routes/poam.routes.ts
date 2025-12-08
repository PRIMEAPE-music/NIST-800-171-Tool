import { Router } from 'express';
import { poamController } from '../controllers/poam.controller';
import { poamExportController } from '../controllers/poam-export.controller';
import {
  validateCreatePoam,
  validateUpdatePoam,
  validateCreateMilestone,
  validateUpdateMilestone,
} from '../middleware/poam.validation';

const router = Router();

// POAM routes - specific routes BEFORE parameterized routes
router.get('/stats', poamController.getPoamStats.bind(poamController));
router.get('/controls', poamExportController.getControls.bind(poamExportController));
router.get('/', poamController.getAllPoams.bind(poamController));

// Bulk operation routes (must come before /:id routes)
router.patch(
  '/bulk-update-status',
  poamExportController.bulkUpdateStatus.bind(poamExportController)
);
router.delete(
  '/bulk-delete',
  poamExportController.bulkDelete.bind(poamExportController)
);

// Export routes (must come before /:id routes)
router.post(
  '/export/bulk-pdf',
  poamExportController.exportBulkPdf.bind(poamExportController)
);
router.post(
  '/export/excel',
  poamExportController.exportExcel.bind(poamExportController)
);
router.post(
  '/export/csv',
  poamExportController.exportCsv.bind(poamExportController)
);

// Parameterized routes
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

// Unmark milestone as complete
router.patch(
  '/:poamId/milestones/:milestoneId/uncomplete',
  poamExportController.uncompleteMilestone.bind(poamExportController)
);

// Single POAM export (must come after milestone routes due to path structure)
router.post(
  '/:id/export/pdf',
  poamExportController.exportPdf.bind(poamExportController)
);

export default router;
