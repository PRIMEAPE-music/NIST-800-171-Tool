import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PolicyType } from '../types/m365.types';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';
import { policySyncService } from '../services/policySync.service';
import policyViewerService from '../services/policyViewer.service';
// REMOVED: Mapping service imports - no longer mapping policies to controls
import { PolicySearchParams } from '../types/policyViewer.types';
import secureScoreRoutes from './secureScore.routes';
import complianceManagerRoutes from './complianceManager.routes';
import m365SettingsRoutes from './m365Settings.routes';

const router = Router();
const prisma = new PrismaClient();

// Mount Secure Score routes
router.use('/secure-score', secureScoreRoutes);

// Mount Compliance Manager routes
router.use('/compliance-manager', complianceManagerRoutes);

// Mount M365 Settings routes (new in Phase 5)
router.use('/', m365SettingsRoutes);

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
 * GET /api/m365/sync-logs
 * Get detailed sync logs with compliance information
 */
router.get('/sync-logs', async (req, res) => {
  try {
    const logs = await prisma.m365SyncLog.findMany({
      orderBy: { syncDate: 'desc' },
      take: 50,
    });

    // Enhance logs with compliance information
    const enhancedLogs = logs.map(log => ({
      ...log,
      complianceChecked: log.complianceChecked,
      complianceSummary: log.complianceChecked
        ? {
            settingsValidated: log.settingsValidated,
            controlsAffected: log.controlsAffected,
            improved: log.complianceImproved,
            declined: log.complianceDeclined,
            hasErrors: !!log.complianceErrors,
            errorCount: log.complianceErrors
              ? JSON.parse(log.complianceErrors).length
              : 0,
          }
        : null,
    }));

    res.json({
      success: true,
      data: enhancedLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync logs',
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

// REMOVED: Control mappings route - no longer mapping policies to controls
// REMOVED: Suggested mappings route - no longer mapping policies to controls
// REMOVED: Approve mapping route - no longer mapping policies to controls
// REMOVED: Delete mapping route - no longer mapping policies to controls

// REMOVED: Bulk approve mappings route - no longer mapping policies to controls
// REMOVED: Bulk reject mappings route - no longer mapping policies to controls

// ============================================================================
// POLICY VIEWER ENDPOINTS
// ============================================================================

/**
 * GET /api/m365/policies/viewer
 * Get policies with detailed formatting for viewer (with search/filter)
 */
router.get('/policies/viewer', async (req, res) => {
  try {
    const {
      policyType,
      searchTerm,
      isActive,
      controlId,
      sortBy,
      sortOrder,
    } = req.query;

    const params: PolicySearchParams = {
      policyType: policyType as any,
      searchTerm: searchTerm as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      controlId: controlId as string,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    const policies = await policyViewerService.getPolicies(params);

    res.json({
      success: true,
      count: policies.length,
      policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/policies/viewer/stats
 * Get policy viewer statistics
 */
router.get('/policies/viewer/stats', async (req, res) => {
  try {
    const stats = await policyViewerService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/policies/viewer/export
 * Export all policy data
 */
router.get('/policies/viewer/export', async (req, res) => {
  try {
    const exportData = await policyViewerService.getExportData();
    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/policies/viewer/:id
 * Get single policy detail
 */
router.get('/policies/viewer/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const policy = await policyViewerService.getPolicyById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    res.json({
      success: true,
      policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/policies/viewer/:id/control-mappings
 * Get control mappings for a specific policy
 * Shows which settings from this policy are validated and which controls they map to
 */
router.get('/policies/viewer/:id/control-mappings', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    // Get policy to verify it exists
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: { id: true, policyName: true, policyType: true },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Get all compliance checks for this policy's settings
    // Only include settings that have an actual value (i.e., are configured in this policy)
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId,
        // Filter out settings that aren't configured (actualValue is null or 'null')
        NOT: {
          OR: [
            { actualValue: null },
            { actualValue: 'null' }
          ]
        }
      },
      include: {
        setting: {
          include: {
            controlMappings: {
              include: {
                control: {
                  select: {
                    id: true,
                    controlId: true,
                    title: true,
                    family: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by control
    const controlMap = new Map<number, any>();

    for (const check of complianceChecks) {
      for (const mapping of check.setting.controlMappings) {
        const controlId = mapping.control.id;

        if (!controlMap.has(controlId)) {
          controlMap.set(controlId, {
            controlId: mapping.control.controlId,
            controlTitle: mapping.control.title,
            family: mapping.control.family,
            settings: [],
          });
        }

        controlMap.get(controlId)!.settings.push({
          settingId: check.setting.id,
          settingName: check.setting.displayName,
          expectedValue: check.setting.expectedValue,
          actualValue: check.actualValue,
          isCompliant: check.isCompliant,
          confidence: mapping.confidence,
          validationOperator: check.setting.validationOperator,
          policyType: check.setting.policyType,
          platform: check.setting.platform,
          lastChecked: check.lastChecked,
        });
      }
    }

    // Convert map to array and calculate summary stats
    const controls = Array.from(controlMap.values());
    const totalSettings = complianceChecks.length;
    const compliantSettings = complianceChecks.filter(c => c.isCompliant).length;
    const nonCompliantSettings = totalSettings - compliantSettings;

    res.json({
      success: true,
      data: {
        policyId: policy.id,
        policyName: policy.policyName,
        policyType: policy.policyType,
        summary: {
          totalSettings,
          compliantSettings,
          nonCompliantSettings,
          controlsAffected: controls.length,
        },
        controls,
      },
    });
  } catch (error) {
    console.error('Error fetching policy control mappings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// GAP ANALYSIS ENDPOINTS
// ============================================================================

// REMOVED: Gap analysis route - no longer mapping policies to controls
// REMOVED: Gap analysis export route - no longer mapping policies to controls
// REMOVED: Recommendations route - no longer mapping policies to controls
// REMOVED: Improvement actions route - no longer mapping policies to controls

export default router;
