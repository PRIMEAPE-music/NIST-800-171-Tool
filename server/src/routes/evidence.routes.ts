import { Router } from 'express';
import { EvidenceController } from '../controllers/evidence.controller';
import { uploadMultiple } from '../middleware/upload.middleware';

const router = Router();
const evidenceController = new EvidenceController();

// Upload evidence (supports multiple files)
router.post(
  '/upload',
  uploadMultiple,
  (req, res, next) => evidenceController.uploadEvidence(req, res, next)
);

// Get all evidence (with optional filters)
router.get(
  '/',
  (req, res, next) => evidenceController.getEvidence(req, res, next)
);

// Get evidence statistics
router.get(
  '/stats',
  (req, res, next) => evidenceController.getEvidenceStats(req, res, next)
);

// Get evidence gaps (controls without evidence)
router.get(
  '/gaps',
  (req, res, next) => evidenceController.getEvidenceGaps(req, res, next)
);

// Download evidence file
router.get(
  '/download/:id',
  (req, res, next) => evidenceController.downloadEvidence(req, res, next)
);

// Get evidence requirements for control
router.get(
  '/requirements/:controlId',
  (req, res, next) => evidenceController.getEvidenceRequirements(req, res, next)
);

// Get evidence for specific control
router.get(
  '/control/:controlId',
  (req, res, next) => evidenceController.getEvidenceForControl(req, res, next)
);

// Get evidence by ID
router.get(
  '/:id',
  (req, res, next) => evidenceController.getEvidenceById(req, res, next)
);

// Update evidence metadata
router.put(
  '/:id',
  (req, res, next) => evidenceController.updateEvidence(req, res, next)
);

// Delete evidence
router.delete(
  '/:id',
  (req, res, next) => evidenceController.deleteEvidence(req, res, next)
);

export default router;
