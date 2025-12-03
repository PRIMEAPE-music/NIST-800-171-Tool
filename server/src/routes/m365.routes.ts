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
 * GET /api/m365/policies/viewer/all-settings
 * Get all UNIQUE policy settings that are mapped to controls
 * Shows unique settings → controls mapping for entire system
 * IMPORTANT: This route must come BEFORE /:id routes to avoid matching "all-settings" as an ID
 */
router.get('/policies/viewer/all-settings', async (req, res) => {
  try {
    // Get all UNIQUE settings that have control mappings
    const settings = await prisma.m365Setting.findMany({
      where: {
        controlMappings: {
          some: {}, // Only include settings that ARE mapped to at least one control
        },
        isActive: true, // Only active settings
      },
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                id: true,
                controlId: true,
                title: true,
                family: true,
                priority: true,
              },
            },
          },
        },
        // Get the most recent compliance check for this setting across all policies
        complianceChecks: {
          orderBy: {
            lastChecked: 'desc',
          },
          take: 1,
          include: {
            policy: {
              select: {
                id: true,
                policyName: true,
                policyType: true,
              },
            },
          },
        },
        // Get the most recent manual review
        manualReviews: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    // Transform the data into a more frontend-friendly format
    const settingsWithControls = settings.map((setting) => {
      // Get the most recent compliance check (if any)
      const latestCheck = setting.complianceChecks[0];

      return {
        // Setting metadata
        id: setting.id,
        settingId: setting.id,
        settingName: setting.displayName,
        settingDescription: setting.description,
        settingPath: setting.settingPath,
        policyType: setting.policyType,
        platform: setting.platform,

        // Policy info (from latest check, if available)
        policyId: latestCheck?.policy.id || null,
        policyName: latestCheck?.policy.policyName || null,

        // Compliance data (from latest check, if available)
        expectedValue: setting.expectedValue || latestCheck?.expectedValue || 'Not specified',
        actualValue: latestCheck?.actualValue || null,
        isCompliant: latestCheck?.isCompliant || false,
        complianceMessage: latestCheck?.complianceMessage || null,
        complianceStatus: latestCheck
          ? latestCheck.isCompliant
            ? 'COMPLIANT'
            : latestCheck.actualValue === null || latestCheck.actualValue === 'null'
            ? 'NOT_CONFIGURED'
            : 'NON_COMPLIANT'
          : 'NOT_CONFIGURED',
        lastChecked: latestCheck?.lastChecked || null,

        // Validation details
        validationOperator: setting.validationOperator,
        implementationGuide: setting.implementationGuide,
        microsoftDocsUrl: setting.microsoftDocsUrl,

        // Confidence
        confidence: setting.confidence || 'Unknown',

        // Mapped controls (multiple controls can be mapped to one setting)
        mappedControls: setting.controlMappings.map((mapping) => ({
          controlId: mapping.control.controlId,
          controlTitle: mapping.control.title,
          controlFamily: mapping.control.family,
          controlPriority: mapping.control.priority,
          mappingConfidence: mapping.confidence,
          mappingRationale: mapping.mappingRationale,
          isRequired: mapping.isRequired,
        })),

        // Manual review data
        manualReview: setting.manualReviews[0] ? {
          id: setting.manualReviews[0].id,
          isReviewed: setting.manualReviews[0].isReviewed,
          reviewedAt: setting.manualReviews[0].reviewedAt?.toISOString() || null,
          manualComplianceStatus: setting.manualReviews[0].manualComplianceStatus,
          manualExpectedValue: setting.manualReviews[0].manualExpectedValue,
          rationale: setting.manualReviews[0].rationale,
        } : null,
      };
    });

    // Calculate summary statistics
    const summary = {
      total: settingsWithControls.length,
      compliant: settingsWithControls.filter((s) => s.complianceStatus === 'COMPLIANT').length,
      nonCompliant: settingsWithControls.filter((s) => s.complianceStatus === 'NON_COMPLIANT')
        .length,
      notConfigured: settingsWithControls.filter((s) => s.complianceStatus === 'NOT_CONFIGURED')
        .length,

      // Breakdown by control priority
      byPriority: {
        critical: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Critical')
        ).length,
        high: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'High')
        ).length,
        medium: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Medium')
        ).length,
        low: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Low')
        ).length,
      },

      // Breakdown by control family
      byFamily: settingsWithControls.reduce((acc, setting) => {
        setting.mappedControls.forEach((control) => {
          acc[control.controlFamily] = (acc[control.controlFamily] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),

      // Breakdown by platform
      byPlatform: settingsWithControls.reduce((acc, setting) => {
        acc[setting.platform] = (acc[setting.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      // Breakdown by policy type
      byPolicyType: settingsWithControls.reduce((acc, setting) => {
        acc[setting.policyType] = (acc[setting.policyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({
      success: true,
      settings: settingsWithControls,
      summary,
    });
  } catch (error) {
    console.error('Error fetching all settings-to-controls:', error);
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

    // Get policy to verify it exists and get its template
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: { id: true, policyName: true, policyType: true, odataType: true },
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
          settingDescription: check.setting.description,
          settingPath: check.setting.settingPath,
          expectedValue: check.setting.expectedValue,
          actualValue: check.actualValue,
          isCompliant: check.isCompliant,
          confidence: mapping.confidence,
          validationOperator: check.setting.validationOperator,
          implementationGuide: check.setting.implementationGuide,
          microsoftDocsUrl: check.setting.microsoftDocsUrl,
          policyType: check.setting.policyType,
          platform: check.setting.platform,
          lastChecked: check.lastChecked,
          mappingStatus: 'CONFIRMED', // Configured in policy = confirmed
          mappedControls: check.setting.controlMappings.map((m) => ({
            controlId: m.control.controlId,
            controlTitle: m.control.title,
            controlFamily: m.control.family,
          })),
        });
      }
    }

    // Fetch ALL manual reviews for this policy (including confirmed mappings)
    const manualReviews = await prisma.manualSettingReview.findMany({
      where: {
        policyId: policyId,
      },
      include: {
        evidenceFiles: true,
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

    const reviewMap = new Map(
      manualReviews.map(r => [
        r.settingId,
        {
          id: r.id,
          isConfirmedMapping: r.isConfirmedMapping,
          manualComplianceStatus: r.manualComplianceStatus,
          rationale: r.rationale,
          reviewedAt: r.reviewedAt,
          reviewedBy: r.reviewedBy,
          evidenceCount: r.evidenceFiles.length,
        },
      ])
    );

    // Add manually confirmed mappings to controlMap
    for (const review of manualReviews) {
      if (review.isConfirmedMapping && review.setting.controlMappings.length > 0) {
        // Skip if already in controlMap from compliance checks
        const alreadyMapped = complianceChecks.some(check => check.setting.id === review.settingId);
        if (alreadyMapped) continue;

        for (const mapping of review.setting.controlMappings) {
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
            settingId: review.setting.id,
            settingName: review.setting.displayName,
            settingDescription: review.setting.description,
            settingPath: review.setting.settingPath,
            expectedValue: review.setting.expectedValue,
            actualValue: 'Manually confirmed',
            isCompliant: review.manualComplianceStatus === 'COMPLIANT',
            confidence: mapping.confidence,
            validationOperator: review.setting.validationOperator,
            implementationGuide: review.setting.implementationGuide,
            microsoftDocsUrl: review.setting.microsoftDocsUrl,
            policyType: review.setting.policyType,
            platform: review.setting.platform,
            lastChecked: review.reviewedAt || new Date(),
            mappingStatus: 'CONFIRMED',
            mappedControls: review.setting.controlMappings.map((m) => ({
              controlId: m.control.controlId,
              controlTitle: m.control.title,
              controlFamily: m.control.family,
            })),
          });
        }
      }
    }

    // Attach manual reviews to settings in controlMap and override compliance status
    for (const control of controlMap.values()) {
      control.settings = control.settings.map((setting: any) => {
        const manualReview = reviewMap.get(setting.settingId) || null;

        // Override isCompliant based on manual review status if present
        let isCompliant = setting.isCompliant;
        if (manualReview?.manualComplianceStatus) {
          isCompliant = manualReview.manualComplianceStatus === 'COMPLIANT';
          // PARTIAL is considered non-compliant for the purposes of the compliance count
        }

        return {
          ...setting,
          isCompliant,
          manualReview,
        };
      });
    }

    // Convert confirmed mappings map to array
    let controls = Array.from(controlMap.values());
    let confirmedSettings = 0;
    let compliantSettings = 0;

    // Count confirmed settings across all controls
    for (const control of controls) {
      for (const setting of control.settings) {
        confirmedSettings++;
        if (setting.isCompliant) {
          compliantSettings++;
        }
      }
    }

    let nonCompliantSettings = confirmedSettings - compliantSettings;

    // ALWAYS fetch potential settings from catalog (not a fallback anymore)
    const potentialControlMap = new Map<number, any>();
    let potentialSettings = 0;

    if (policy.odataType) {
      // Track confirmed setting IDs to avoid duplicates
      const confirmedSettingIds = new Set(
        [...complianceChecks.map(c => c.setting.id),
         ...manualReviews.filter(r => r.isConfirmedMapping).map(r => r.settingId)]
      );

      // Get all potential settings from catalog that match this policy template
      const catalogSettings = await prisma.m365Setting.findMany({
        where: {
          policyTemplate: policy.odataType,
          isActive: true,
          controlMappings: { some: {} }
        },
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
        });

      // Build potential mappings (exclude already confirmed settings)
      for (const setting of catalogSettings) {
        // Skip if already confirmed
        if (confirmedSettingIds.has(setting.id)) continue;

        for (const mapping of setting.controlMappings) {
          const controlId = mapping.control.id;

          // Check if control already exists in main controlMap
          let targetMap = controlMap.get(controlId);
          if (!targetMap) {
            // Check if it exists in potentialControlMap
            if (!potentialControlMap.has(controlId)) {
              potentialControlMap.set(controlId, {
                controlId: mapping.control.controlId,
                controlTitle: mapping.control.title,
                family: mapping.control.family,
                settings: [],
              });
            }
            targetMap = potentialControlMap.get(controlId)!;
          }

          targetMap.settings.push({
            settingId: setting.id,
            settingName: setting.displayName,
            settingDescription: setting.description,
            settingPath: setting.settingPath,
            expectedValue: setting.expectedValue,
            actualValue: 'Not configured',
            isCompliant: false,
            confidence: mapping.confidence,
            validationOperator: setting.validationOperator,
            implementationGuide: setting.implementationGuide,
            microsoftDocsUrl: setting.microsoftDocsUrl,
            policyType: setting.policyType,
            platform: setting.platform,
            lastChecked: new Date(),
            mappingStatus: 'POTENTIAL', // Not confirmed yet
            mappedControls: setting.controlMappings.map((m) => ({
              controlId: m.control.controlId,
              controlTitle: m.control.title,
              controlFamily: m.control.family,
            })),
          });
          potentialSettings++;
        }
      }

      // Merge potential controls into main controls array
      for (const [controlId, potentialControl] of potentialControlMap.entries()) {
        const existingControl = controlMap.get(controlId);
        if (existingControl) {
          // Add potential settings to existing control
          existingControl.settings.push(...potentialControl.settings);
        } else {
          // Add new control with only potential settings
          controlMap.set(controlId, potentialControl);
        }
      }

      // Rebuild controls array after merging
      controls = Array.from(controlMap.values());
    }

    const totalSettings = confirmedSettings + potentialSettings;

    res.json({
      success: true,
      data: {
        policyId: policy.id,
        policyName: policy.policyName,
        policyType: policy.policyType,
        summary: {
          totalSettings,
          confirmedSettings,
          potentialSettings,
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

/**
 * GET /api/m365/policies/viewer/:id/settings-to-controls
 * Get all policy settings that are mapped to controls for a specific policy
 * Shows the inverse relationship - settings → controls
 */
router.get('/policies/viewer/:id/settings-to-controls', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    // Verify policy exists
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

    // Get all compliance checks for this policy that have settings mapped to controls
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId,
        setting: {
          controlMappings: {
            some: {}, // Only include settings that ARE mapped to at least one control
          },
        },
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
                    priority: true,
                  },
                },
              },
            },
            manualReviews: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: {
        setting: {
          displayName: 'asc',
        },
      },
    });

    // Transform the data into a more frontend-friendly format
    const settingsWithControls = complianceChecks.map((check) => ({
      // Setting metadata
      id: check.id,
      settingId: check.settingId,
      settingName: check.setting.displayName,
      settingDescription: check.setting.description,
      settingPath: check.setting.settingPath,
      policyType: check.setting.policyType,
      platform: check.setting.platform,

      // Compliance data
      expectedValue: check.expectedValue,
      actualValue: check.actualValue,
      isCompliant: check.isCompliant,
      complianceMessage: check.complianceMessage,
      complianceStatus: check.isCompliant
        ? 'COMPLIANT'
        : check.actualValue === null || check.actualValue === 'null'
        ? 'NOT_CONFIGURED'
        : 'NON_COMPLIANT',
      lastChecked: check.lastChecked,

      // Validation details
      validationOperator: check.setting.validationOperator,
      implementationGuide: check.setting.implementationGuide,
      microsoftDocsUrl: check.setting.microsoftDocsUrl,

      // Confidence
      confidence: check.setting.confidence || 'Unknown',

      // Mapped controls (multiple controls can be mapped to one setting)
      mappedControls: check.setting.controlMappings.map((mapping) => ({
        controlId: mapping.control.controlId,
        controlTitle: mapping.control.title,
        controlFamily: mapping.control.family,
        controlPriority: mapping.control.priority,
        mappingConfidence: mapping.confidence,
        mappingRationale: mapping.mappingRationale,
        isRequired: mapping.isRequired,
      })),

      // Manual review data
      manualReview: check.setting.manualReviews[0] ? {
        id: check.setting.manualReviews[0].id,
        isReviewed: check.setting.manualReviews[0].isReviewed,
        reviewedAt: check.setting.manualReviews[0].reviewedAt?.toISOString() || null,
        manualComplianceStatus: check.setting.manualReviews[0].manualComplianceStatus,
        manualExpectedValue: check.setting.manualReviews[0].manualExpectedValue,
        rationale: check.setting.manualReviews[0].rationale,
      } : null,
    }));

    // Calculate summary statistics
    const summary = {
      total: settingsWithControls.length,
      compliant: settingsWithControls.filter((s) => s.complianceStatus === 'COMPLIANT').length,
      nonCompliant: settingsWithControls.filter((s) => s.complianceStatus === 'NON_COMPLIANT').length,
      notConfigured: settingsWithControls.filter((s) => s.complianceStatus === 'NOT_CONFIGURED').length,

      // Breakdown by control priority
      byPriority: {
        critical: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Critical')
        ).length,
        high: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'High')
        ).length,
        medium: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Medium')
        ).length,
        low: settingsWithControls.filter((s) =>
          s.mappedControls.some((c) => c.controlPriority === 'Low')
        ).length,
      },

      // Breakdown by control family
      byFamily: settingsWithControls.reduce((acc, setting) => {
        setting.mappedControls.forEach((control) => {
          acc[control.controlFamily] = (acc[control.controlFamily] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),

      // Breakdown by platform
      byPlatform: settingsWithControls.reduce((acc, setting) => {
        acc[setting.platform] = (acc[setting.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.policyName,
        type: policy.policyType,
      },
      settings: settingsWithControls,
      summary,
    });
  } catch (error) {
    console.error('Error fetching policy settings-to-controls:', error);
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
