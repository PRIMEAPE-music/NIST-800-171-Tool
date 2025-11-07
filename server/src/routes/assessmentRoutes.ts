// Express router configuration for assessment endpoints

import { Router } from 'express';
import { AssessmentController } from '../controllers/assessmentController';

const router = Router();

// Assessment CRUD operations
router.post('/', AssessmentController.createAssessment);
router.get('/', AssessmentController.getAllAssessments);
router.get('/latest', AssessmentController.getLatestAssessments);
router.get('/stats', AssessmentController.getStats);
router.get('/gaps', AssessmentController.getGapAnalysis);
router.get('/compare', AssessmentController.compareAssessments);
router.get('/:id', AssessmentController.getAssessmentById);
router.put('/:id', AssessmentController.updateAssessment);
router.delete('/:id', AssessmentController.deleteAssessment);

export { router as assessmentRoutes };
