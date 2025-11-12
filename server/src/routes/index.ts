import { Router } from 'express';
import { controlRoutes } from './controlRoutes';
import { assessmentRoutes } from './assessmentRoutes';
import poamRoutes from './poam.routes';
import evidenceRoutes from './evidence.routes';
import authRoutes from './auth.routes';
import m365Routes from './m365.routes';
import reportRoutes from './reportRoutes';
import settingsRoutes from './settings.routes';
import backupRoutes from './backup.routes';

const router = Router();

// API routes
router.use('/controls', controlRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/poams', poamRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/auth', authRoutes);
router.use('/m365', m365Routes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/backup', backupRoutes);

export default router;
