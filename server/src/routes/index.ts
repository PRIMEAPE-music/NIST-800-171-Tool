import { Router } from 'express';
import { controlRoutes } from './controlRoutes';
// assessmentRoutes import removed - routes deleted
import poamRoutes from './poam.routes';
import evidenceRoutes from './evidence.routes';
import documentRoutes from './document.routes';
import authRoutes from './auth.routes';
import m365Routes from './m365.routes';
import reportRoutes from './reportRoutes';
import settingsRoutes from './settings.routes';
import backupRoutes from './backup.routes';
import microsoftActionsRoutes from './microsoft-actions.routes';
import { gapRoutes } from './gap.routes';
import manualReviewRoutes from './manualReview.routes';
import surveyRoutes from './survey.routes';
import coverageRoutes from './coverage';
import dodScoringRoutes from './dodScoring';
// gapAnalysisRoutes import removed - standalone routes deleted

const router = Router();

// API routes
router.use('/controls', controlRoutes);
// Assessment routes removed - use control detail pages instead
router.use('/poams', poamRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/documents', documentRoutes);
router.use('/auth', authRoutes);
router.use('/m365', m365Routes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/backup', backupRoutes);
router.use('/microsoft-actions', microsoftActionsRoutes);
router.use('/gaps', gapRoutes);
router.use('/manual-reviews', manualReviewRoutes);
router.use('/surveys', surveyRoutes);
router.use('/coverage', coverageRoutes);
router.use('/dod-score', dodScoringRoutes);
// Standalone gap analysis routes removed - use Gap Analysis tab on control detail pages

export default router;
