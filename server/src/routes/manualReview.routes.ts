// server/src/routes/manualReview.routes.ts

import { Router } from 'express';
import { manualReviewService } from '../services/manualReview.service';
import { uploadMultiple } from '../middleware/upload.middleware';

const router = Router();

/**
 * POST /api/manual-reviews
 * Create or update a manual review
 */
router.post('/', async (req, res) => {
  try {
    const { settingId, policyId, controlId, isReviewed, manualComplianceStatus, manualExpectedValue, manualActualValue, rationale } = req.body;

    // Validate required fields
    if (!settingId) {
      return res.status(400).json({ success: false, error: 'settingId is required' });
    }

    if (!rationale || rationale.trim() === '') {
      return res.status(400).json({ success: false, error: 'rationale is required' });
    }

    const review = await manualReviewService.upsertReview({
      settingId,
      policyId: policyId || undefined,
      controlId: controlId || undefined,
      isReviewed: isReviewed ?? true,
      manualComplianceStatus: manualComplianceStatus || undefined,
      manualExpectedValue: manualExpectedValue || undefined,
      manualActualValue: manualActualValue || undefined,
      rationale: rationale.trim(),
    });

    res.json({ success: true, review });
  } catch (error) {
    console.error('Error creating manual review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/selector
 * Get policies for the policy selector sidebar
 * IMPORTANT: Must be before /:settingId/:policyId to avoid route collision
 */
router.get('/policies/selector', async (req, res) => {
  try {
    const { searchTerm, policyType, isActive } = req.query;

    const policies = await manualReviewService.getPoliciesForSelector({
      searchTerm: searchTerm as string | undefined,
      policyType: policyType as string | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, policies });
  } catch (error) {
    console.error('Error fetching policies for selector:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/:policyId/comparison
 * Get policy settings comparison (catalog vs actual)
 * IMPORTANT: Must be before /:settingId/:policyId to avoid route collision
 */
router.get('/policies/:policyId/comparison', async (req, res) => {
  try {
    const policyId = parseInt(req.params.policyId);
    const comparison = await manualReviewService.getPolicySettingsComparison(policyId);
    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Error fetching policy comparison:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/:policyId/raw-settings
 * Get raw policy settings JSON
 * IMPORTANT: Must be before /:settingId/:policyId to avoid route collision
 */
router.get('/policies/:policyId/raw-settings', async (req, res) => {
  try {
    const policyId = parseInt(req.params.policyId);
    const settings = await manualReviewService.getPolicyRawSettings(policyId);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching policy raw settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/setting/:settingId
 * Get all reviews for a setting
 */
router.get('/setting/:settingId', async (req, res) => {
  try {
    const settingId = parseInt(req.params.settingId);
    const reviews = await manualReviewService.getReviewsForSetting(settingId);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews for setting:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/control/:controlId
 * Get all reviews for a control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const controlId = parseInt(req.params.controlId);
    const reviews = await manualReviewService.getReviewsForControl(controlId);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews for control:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/:settingId/:policyId
 * Get a specific review
 * IMPORTANT: Must be AFTER specific routes to avoid catching them
 */
router.get('/:settingId/:policyId', async (req, res) => {
  try {
    const settingId = parseInt(req.params.settingId);
    const policyId = req.params.policyId === '0' ? undefined : parseInt(req.params.policyId);
    const review = await manualReviewService.getReview(settingId, policyId);
    res.json({ success: true, review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/manual-reviews/:id
 * Delete a manual review
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await manualReviewService.deleteReview(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/manual-reviews/:id/evidence
 * Upload evidence files for a manual review
 */
router.post('/:id/evidence', uploadMultiple, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    await manualReviewService.addEvidenceToReview(reviewId, req.files as Express.Multer.File[]);

    res.json({
      success: true,
      message: `Uploaded ${(req.files as Express.Multer.File[]).length} file(s) successfully`,
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/:id/evidence
 * Get evidence files for a manual review
 */
router.get('/:id/evidence', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const evidence = await manualReviewService.getEvidenceForReview(reviewId);

    res.json({
      success: true,
      evidence,
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/manual-reviews/:id/evidence/:evidenceId
 * Delete an evidence file from a manual review
 */
router.delete('/:id/evidence/:evidenceId', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const evidenceId = parseInt(req.params.evidenceId);

    await manualReviewService.deleteEvidenceFromReview(reviewId, evidenceId);

    res.json({
      success: true,
      message: 'Evidence file deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
