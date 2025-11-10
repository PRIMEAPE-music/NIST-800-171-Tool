import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PolicyType } from '../types/m365.types';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';
import { policySyncService } from '../services/policySync.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/m365/intune/compliance-policies
 * Fetch Intune device compliance policies
 */
router.get('/intune/compliance-policies', async (req, res) => {
  try {
    const policies = await intuneService.getDeviceCompliancePolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/configuration-policies
 * Fetch Intune device configuration policies
 */
router.get('/intune/configuration-policies', async (req, res) => {
  try {
    const policies = await intuneService.getDeviceConfigurationPolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/all
 * Fetch all Intune data
 */
router.get('/intune/all', async (req, res) => {
  try {
    const data = await intuneService.getAllPolicies();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/security-features
 * Check Intune security feature status
 */
router.get('/intune/security-features', async (req, res) => {
  try {
    const features = await intuneService.checkSecurityFeatures();
    res.json({ success: true, features });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/purview/sensitivity-labels
 * Fetch Purview sensitivity labels
 */
router.get('/purview/sensitivity-labels', async (req, res) => {
  try {
    const labels = await purviewService.getSensitivityLabels();
    res.json({ success: true, count: labels.length, labels });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/purview/summary
 * Get Purview information protection summary
 */
router.get('/purview/summary', async (req, res) => {
  try {
    const summary = await purviewService.getInformationProtectionSummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/conditional-access
 * Fetch Azure AD conditional access policies
 */
router.get('/azuread/conditional-access', async (req, res) => {
  try {
    const policies = await azureADService.getConditionalAccessPolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/mfa-status
 * Get MFA enforcement status
 */
router.get('/azuread/mfa-status', async (req, res) => {
  try {
    const status = await azureADService.getMFAStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/security-summary
 * Get comprehensive Azure AD security summary
 */
router.get('/azuread/security-summary', async (req, res) => {
  try {
    const summary = await azureADService.getSecuritySummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/dashboard
 * Get all M365 data for dashboard (combined)
 */
router.get('/dashboard', async (req, res) => {
  try {
    console.log('Fetching M365 dashboard data...');

    const [intuneData, purviewData, azureADData] = await Promise.all([
      intuneService.getAllPolicies().catch(err => {
        console.error('Intune fetch error:', err);
        return null;
      }),
      purviewService.getInformationProtectionSummary().catch(err => {
        console.error('Purview fetch error:', err);
        return null;
      }),
      azureADService.getSecuritySummary().catch(err => {
        console.error('Azure AD fetch error:', err);
        return null;
      }),
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      intune: intuneData ? {
        compliancePoliciesCount: intuneData.compliancePolicies.length,
        configurationPoliciesCount: intuneData.configurationPolicies.length,
        managedDevicesCount: intuneData.deviceCount,
      } : null,
      purview: purviewData ? {
        sensitivityLabelsCount: purviewData.sensitivityLabelsCount,
        isConfigured: purviewData.isConfigured,
      } : null,
      azureAD: azureADData ? {
        conditionalAccessPoliciesCount: azureADData.conditionalAccessPolicies.length,
        mfaEnabled: azureADData.mfaStatus.enabled,
        securityDefaultsEnabled: azureADData.securityDefaultsEnabled,
      } : null,
    };

    res.json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/m365/sync
 * Trigger manual sync of M365 policies
 */
router.post('/sync', async (req, res) => {
  try {
    const { forceRefresh = true } = req.body;

    console.log('Manual sync triggered');
    const result = await policySyncService.syncAllPolicies(forceRefresh);

    res.json({
      success: true,
      message: 'Sync completed',
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/sync/status
 * Get sync status and history
 */
router.get('/sync/status', async (req, res) => {
  try {
    const status = await policySyncService.getSyncStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/stats
 * Get M365 integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await policySyncService.getIntegrationStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/policies
 * Get all synced policies
 */
router.get('/policies', async (req, res) => {
  try {
    const { policyType } = req.query;

    const policies = await prisma.m365Policy.findMany({
      where: policyType ? { policyType: policyType as PolicyType } : undefined,
      orderBy: { lastSynced: 'desc' },
    });

    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/control/:controlId/mappings
 * Get policy mappings for a specific control
 */
router.get('/control/:controlId/mappings', async (req, res) => {
  try {
    const controlId = parseInt(req.params.controlId);
    const mappings = await policySyncService.getPolicyMappingsForControl(controlId);

    res.json({ success: true, count: mappings.length, mappings });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
