import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PolicyType } from '../types/m365.types';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';
import { policySyncService } from '../services/policySync.service';
import policyViewerService from '../services/policyViewer.service';
import settingsMapperService from '../services/settingsMapper.service';
import { improvementActionMappingService } from '../services/improvementActionMapping.service';
import { PolicySearchParams } from '../types/policyViewer.types';
import secureScoreRoutes from './secureScore.routes';
import complianceManagerRoutes from './complianceManager.routes';

const router = Router();
const prisma = new PrismaClient();

// Mount Secure Score routes
router.use('/secure-score', secureScoreRoutes);

// Mount Compliance Manager routes
router.use('/compliance-manager', complianceManagerRoutes);

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

/**
 * GET /api/m365/suggested-mappings
 * Get suggested mappings for review
 */
router.get('/suggested-mappings', async (req, res) => {
  try {
    const { confidence } = req.query;

    const where: any = {};
    if (confidence) {
      where.mappingConfidence = confidence;
    }

    const suggestions = await prisma.controlPolicyMapping.findMany({
      where,
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            family: true,
          },
        },
        policy: {
          select: {
            policyName: true,
            policyType: true,
            policyDescription: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggested mappings:', error);
    res.status(500).json({ error: 'Failed to fetch suggested mappings' });
  }
});

/**
 * POST /api/m365/mappings/:id/approve
 * Approve a mapping
 */
router.post('/mappings/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const mapping = await prisma.controlPolicyMapping.update({
      where: { id: parseInt(id) },
      data: {
        mappingNotes: prisma.raw(`mapping_notes || '\n[Approved by user]'`),
      },
    });

    res.json({ success: true, mapping });
  } catch (error) {
    console.error('Error approving mapping:', error);
    res.status(500).json({ error: 'Failed to approve mapping' });
  }
});

/**
 * DELETE /api/m365/mappings/:id
 * Reject and delete a mapping
 */
router.delete('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.controlPolicyMapping.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

/**
 * POST /api/m365/mappings/bulk-approve
 * Bulk approve mappings
 */
router.post('/mappings/bulk-approve', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    // Update each mapping individually to append approval note
    const updatePromises = ids.map(id =>
      prisma.controlPolicyMapping.findUnique({
        where: { id: parseInt(id) },
      }).then(mapping => {
        if (mapping) {
          return prisma.controlPolicyMapping.update({
            where: { id: parseInt(id) },
            data: {
              mappingNotes: `${mapping.mappingNotes || ''}\n[Bulk approved by user]`,
            },
          });
        }
        return null;
      })
    );

    await Promise.all(updatePromises);

    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk approving mappings:', error);
    res.status(500).json({ error: 'Failed to bulk approve mappings' });
  }
});

/**
 * POST /api/m365/mappings/bulk-reject
 * Bulk reject mappings
 */
router.post('/mappings/bulk-reject', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    await prisma.controlPolicyMapping.deleteMany({
      where: { id: { in: ids.map(id => parseInt(id)) } },
    });

    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk rejecting mappings:', error);
    res.status(500).json({ error: 'Failed to bulk reject mappings' });
  }
});

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

// ============================================================================
// GAP ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/m365/gap-analysis
 * Get comprehensive gap analysis showing controls with missing or non-compliant settings
 */
router.get('/gap-analysis', async (req, res) => {
  try {
    const analysis = await settingsMapperService.getGapAnalysis();

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/gap-analysis/export
 * Export gap analysis report with actionable remediation steps
 */
router.get('/gap-analysis/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const analysis = await settingsMapperService.getGapAnalysis();

    if (format === 'json') {
      // JSON export with full details
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="m365-gap-analysis-${new Date().toISOString().split('T')[0]}.json"`
      );
      res.json({
        exportDate: new Date().toISOString(),
        summary: {
          totalControls: analysis.totalControls,
          controlsFullyCovered: analysis.controlsFullyCovered,
          controlsPartiallyCovered: analysis.controlsPartiallyCovered,
          controlsNotCovered: analysis.controlsNotCovered,
          coveragePercentage: analysis.coveragePercentage,
        },
        gaps: analysis.gaps,
      });
    } else if (format === 'csv') {
      // CSV export for spreadsheet analysis
      const csvRows = [
        ['Control ID', 'Control Title', 'Family', 'Priority', 'Gap Type', 'Recommended Actions'].join(','),
      ];

      for (const gap of analysis.gaps) {
        const actions = gap.recommendedActions.join('; ').replace(/"/g, '""');
        csvRows.push(
          [
            gap.controlId,
            `"${gap.controlTitle.replace(/"/g, '""')}"`,
            gap.family,
            gap.priority,
            gap.gapType,
            `"${actions}"`,
          ].join(',')
        );
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="m365-gap-analysis-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csvRows.join('\n'));
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid format. Use "json" or "csv"',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/recommendations/:controlId
 * Get Microsoft 365 implementation recommendations for a specific control
 */
router.get('/recommendations/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const recommendations = await settingsMapperService.getRecommendations(controlId);

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/improvement-actions/:controlId
 * Get improvement actions with policy mappings showing which policies satisfy each action
 */
router.get('/improvement-actions/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const actions = await improvementActionMappingService.getImprovementActionsWithPolicies(controlId);

    res.json({
      success: true,
      controlId,
      count: actions.length,
      actions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
