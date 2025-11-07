import { Router } from 'express';
import { controlRoutes } from './controlRoutes';
import { assessmentRoutes } from './assessmentRoutes';
import poamRoutes from './poam.routes';
import evidenceRoutes from './evidence.routes';

const router = Router();

// API routes
router.use('/controls', controlRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/poams', poamRoutes);
router.use('/evidence', evidenceRoutes);

// Future routes will be added here:
// router.use('/m365', m365Routes);
// router.use('/reports', reportRoutes);
// router.use('/settings', settingsRoutes);

export default router;
