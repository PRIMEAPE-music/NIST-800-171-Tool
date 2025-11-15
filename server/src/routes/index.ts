import { Router } from 'express';
import { controlRoutes } from './controlRoutes';
// assessmentRoutes import removed - routes deleted
import poamRoutes from './poam.routes';
import evidenceRoutes from './evidence.routes';
import authRoutes from './auth.routes';
import m365Routes from './m365.routes';
import reportRoutes from './reportRoutes';
import settingsRoutes from './settings.routes';
import backupRoutes from './backup.routes';
// gapAnalysisRoutes import removed - standalone routes deleted

const router = Router();

// API routes
router.use('/controls', controlRoutes);
// Assessment routes removed - use control detail pages instead
router.use('/poams', poamRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/auth', authRoutes);
router.use('/m365', m365Routes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/backup', backupRoutes);
// Standalone gap analysis routes removed - use Gap Analysis tab on control detail pages

export default router;
