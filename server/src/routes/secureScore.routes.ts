import { Router } from 'express';
import { secureScoreService } from '../services/secureScore.service';

const router = Router();

/**
 * GET /api/m365/secure-score
 * Get Secure Score summary with current score and control profiles
 */
router.get('/', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';
    const summary = await secureScoreService.getSecureScoreSummary(shouldRefresh);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Secure Score data not available',
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
 * POST /api/m365/secure-score/sync
 * Manually sync/refresh Secure Score data from Microsoft
 */
router.post('/sync', async (_req, res) => {
  try {
    console.log('Manual Secure Score sync triggered');

    // Force refresh to get latest data
    const summary = await secureScoreService.getSecureScoreSummary(true);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Failed to sync Secure Score data',
      });
    }

    return res.json({
      success: true,
      message: 'Secure Score data synced successfully',
      summary,
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
 * GET /api/m365/secure-score/control/:controlId
 * Get enriched recommendations for a specific NIST control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const { forceRefresh } = req.query;
    const shouldRefresh = forceRefresh === 'true';

    const enrichedData = await secureScoreService.enrichRecommendations(
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
 * GET /api/m365/secure-score/cache-status
 * Get cache status and metadata
 */
router.get('/cache-status', async (_req, res) => {
  try {
    const status = secureScoreService.getCacheStatus();
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
 * DELETE /api/m365/secure-score/cache
 * Clear the Secure Score cache
 */
router.delete('/cache', async (_req, res) => {
  try {
    secureScoreService.clearCache();
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
