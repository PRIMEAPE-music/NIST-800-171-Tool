import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

/**
 * GET /api/settings
 * Get all settings grouped by category
 */
export const getAllSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/settings/:category
 * Get settings for a specific category
 */
export const getSettingsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const settings = await settingsService.getSettingsByCategory(category);
    res.json(settings);
  } catch (error) {
    console.error(`Error fetching ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to fetch ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * PUT /api/settings/:category
 * Update multiple settings in a category
 */
export const updateSettingsCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Settings object is required',
      });
    }

    await settingsService.updateSettingsCategory(category, settings);

    // If M365 settings were updated, clear the auth cache
    if (category === 'm365') {
      authService.clearTokenCache();
      graphClientService.resetClient();
    }

    res.json({
      message: `${category} settings updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error updating ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to update ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * PATCH /api/settings/:key
 * Update a single setting
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Value is required',
      });
    }

    await settingsService.updateSetting(key, value);

    // If M365 setting was updated, clear the auth cache
    if (key.startsWith('m365_')) {
      authService.clearTokenCache();
      graphClientService.resetClient();
    }

    res.json({
      message: 'Setting updated successfully',
      key,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error updating setting ${req.params.key}:`, error);
    res.status(500).json({
      error: 'Failed to update setting',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/settings/m365/test-connection
 * Test M365 connection with current or provided credentials
 */
export const testM365Connection = async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId, clientSecret } = req.body;

    // If credentials provided, temporarily use them for test
    if (tenantId && clientId && clientSecret) {
      // Temporarily override env vars for this test
      const originalTenant = process.env.AZURE_TENANT_ID;
      const originalClient = process.env.AZURE_CLIENT_ID;
      const originalSecret = process.env.AZURE_CLIENT_SECRET;

      try {
        process.env.AZURE_TENANT_ID = tenantId;
        process.env.AZURE_CLIENT_ID = clientId;
        process.env.AZURE_CLIENT_SECRET = clientSecret;

        // Clear cache and reset client to use new credentials
        authService.clearTokenCache();
        graphClientService.resetClient();

        const isConnected = await graphClientService.testConnection();

        // Restore original values
        process.env.AZURE_TENANT_ID = originalTenant;
        process.env.AZURE_CLIENT_ID = originalClient;
        process.env.AZURE_CLIENT_SECRET = originalSecret;

        authService.clearTokenCache();
        graphClientService.resetClient();

        if (isConnected) {
          res.json({
            connected: true,
            message: 'Successfully connected to Microsoft Graph API',
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(503).json({
            connected: false,
            message: 'Failed to connect to Microsoft Graph API',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (testError) {
        // Restore original values on error
        process.env.AZURE_TENANT_ID = originalTenant;
        process.env.AZURE_CLIENT_ID = originalClient;
        process.env.AZURE_CLIENT_SECRET = originalSecret;

        authService.clearTokenCache();
        graphClientService.resetClient();

        throw testError;
      }
    } else {
      // Use stored credentials
      const isConnected = await graphClientService.testConnection();

      if (isConnected) {
        res.json({
          connected: true,
          message: 'Successfully connected to Microsoft Graph API',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          connected: false,
          message: 'Failed to connect with stored credentials',
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error testing M365 connection:', error);
    res.status(500).json({
      connected: false,
      message: 'Error testing connection',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * DELETE /api/settings/:category/reset
 * Reset settings category to defaults
 */
export const resetSettingsCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    await settingsService.resetCategory(category);

    res.json({
      message: `${category} settings reset to defaults`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error resetting ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to reset ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
