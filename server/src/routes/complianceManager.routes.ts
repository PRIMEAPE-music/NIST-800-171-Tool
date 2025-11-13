import { Router } from 'express';
import { complianceManagerService } from '../services/complianceManager.service';

const router = Router();

/**
 * GET /api/m365/compliance-manager
 * Get Compliance Score summary with overall compliance score
 */
router.get('/', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';
    const summary = await complianceManagerService.getComplianceScoreSummary(shouldRefresh);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Compliance Manager data not available. Please ensure you have a NIST 800-171 assessment created in Microsoft Compliance Manager.',
        message: 'No NIST assessment found',
      });
    }

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/compliance-manager/assessments
 * Get all compliance assessments
 */
router.get('/assessments', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';
    const { assessments } = await complianceManagerService.getComplianceData(shouldRefresh);

    if (!assessments || assessments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No compliance assessments found',
        message: 'Please create an assessment in Microsoft Compliance Manager',
      });
    }

    return res.json({
      success: true,
      assessments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/compliance-manager/nist-assessment
 * Get NIST 800-171 specific assessment
 */
router.get('/nist-assessment', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';
    const nistAssessment = await complianceManagerService.getNISTAssessment(shouldRefresh);

    if (!nistAssessment) {
      return res.status(404).json({
        success: false,
        error: 'NIST 800-171 assessment not found',
        message: 'Please create a NIST 800-171 assessment in Microsoft Compliance Manager',
      });
    }

    return res.json({
      success: true,
      assessment: nistAssessment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/compliance-manager/improvement-actions
 * Get all compliance improvement actions
 */
router.get('/improvement-actions', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';
    const { improvementActions } = await complianceManagerService.getComplianceData(shouldRefresh);

    return res.json({
      success: true,
      actions: improvementActions,
      count: improvementActions.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/compliance-manager/control/:controlId
 * Get enriched compliance recommendations for a specific NIST control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';

    const enrichedData = await complianceManagerService.enrichComplianceRecommendations(
      controlId,
      shouldRefresh
    );

    return res.json({
      success: true,
      data: enrichedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/m365/compliance-manager/sync
 * Manually sync/refresh Compliance Manager data from Microsoft
 */
router.post('/sync', async (_req, res) => {
  try {
    console.log('Manual Compliance Manager sync triggered');

    const syncResult = await complianceManagerService.syncComplianceManager();

    if (!syncResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Compliance Manager sync failed',
        errors: syncResult.errors,
      });
    }

    return res.json({
      success: true,
      message: 'Compliance Manager data synced successfully',
      result: syncResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/compliance-manager/cache-status
 * Get cache status and metadata
 */
router.get('/cache-status', async (_req, res) => {
  try {
    const status = complianceManagerService.getCacheStatus();
    return res.json({
      success: true,
      cache: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/m365/compliance-manager/cache
 * Clear the Compliance Manager cache
 */
router.delete('/cache', async (_req, res) => {
  try {
    complianceManagerService.clearCache();
    return res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
