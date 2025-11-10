import { Router } from 'express';
import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

const router = Router();

/**
 * GET /api/auth/status
 * Check M365 authentication status
 */
router.get('/status', async (req, res) => {
  try {
    const isConnected = await authService.validateConnection();

    res.json({
      connected: isConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: 'Failed to validate connection',
    });
  }
});

/**
 * GET /api/auth/test-graph
 * Test Graph API connection
 */
router.get('/test-graph', async (req, res) => {
  try {
    const isConnected = await graphClientService.testConnection();

    if (isConnected) {
      res.json({
        success: true,
        message: 'Successfully connected to Microsoft Graph API',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Failed to connect to Microsoft Graph API',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing Graph API connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Force token refresh
 */
router.post('/refresh-token', async (req, res) => {
  try {
    authService.clearTokenCache();
    graphClientService.resetClient();

    // Acquire new token to validate
    const isConnected = await authService.validateConnection();

    res.json({
      success: isConnected,
      message: 'Token cache cleared and refreshed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
