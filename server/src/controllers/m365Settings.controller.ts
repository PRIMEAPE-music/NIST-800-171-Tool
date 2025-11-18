/**
 * M365 Settings API Controllers
 * Request handlers for M365 settings and compliance endpoints
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  SettingsListQuery,
  ValidateSettingsRequest,
  SettingsListResponse,
  SettingDetailResponse,
  ControlSettingsResponse,
  ControlComplianceResponse,
  ValidationResponse,
  ComplianceRecalculationResponse,
} from '../types/m365Api.types';
import { sendSuccess, sendNotFoundError, sendServerError } from '../utils/apiResponse';

const prisma = new PrismaClient();

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/m365/settings
 * List all M365 settings with optional filtering and pagination
 */
export async function listSettings(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as SettingsListQuery;
    const { policyType, platform, search, limit, offset } = query;

    // Build WHERE clause
    const where: any = {};

    if (policyType) {
      where.policyType = policyType;
    }

    if (platform) {
      where.platform = platform;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { settingPath: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute queries
    const [settings, total] = await Promise.all([
      prisma.m365Setting.findMany({
        where,
        include: {
          complianceChecks: {
            select: {
              isCompliant: true,
              lastChecked: true,
            },
            take: 1,
            orderBy: {
              lastChecked: 'desc',
            },
          },
          controlMappings: {
            select: {
              confidence: true,
            },
            take: 1,
          },
        },
        orderBy: [
          { displayName: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.m365Setting.count({ where }),
    ]);

    // Format response
    const response: SettingsListResponse = {
      data: settings.map(s => {
        const latestCheck = s.complianceChecks[0];
        const complianceStatus = latestCheck
          ? (latestCheck.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT')
          : 'NOT_CHECKED';

        return {
          id: s.id.toString(),
          displayName: s.displayName,
          policyType: s.policyType,
          platform: s.platform,
          confidence: s.controlMappings[0]?.confidence || 'MEDIUM',
          complianceStatus: complianceStatus as any,
          lastChecked: latestCheck?.lastChecked,
        };
      }),
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    sendSuccess(res, response.data, response.meta);
  } catch (error) {
    sendServerError(res, error as Error, 'listSettings');
  }
}

/**
 * GET /api/m365/settings/:id
 * Get detailed information about a specific setting
 */
export async function getSettingDetail(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);

    const setting = await prisma.m365Setting.findUnique({
      where: { id },
      include: {
        complianceChecks: {
          orderBy: {
            lastChecked: 'desc',
          },
          take: 1,
        },
        controlMappings: {
          include: {
            control: {
              select: {
                controlId: true,
                title: true,
                family: true,
              },
            },
          },
        },
      },
    });

    if (!setting) {
      sendNotFoundError(res, 'Setting', req.params.id);
      return;
    }

    const latestCheck = setting.complianceChecks[0];

    // Format response
    const response: SettingDetailResponse = {
      id: setting.id.toString(),
      displayName: setting.displayName,
      description: setting.description,
      policyType: setting.policyType,
      platform: setting.platform,
      settingPath: setting.settingPath,
      expectedValue: setting.expectedValue,
      validationOperator: setting.validationOperator,
      confidence: setting.controlMappings[0]?.confidence || 'MEDIUM',
      implementationGuide: setting.implementationGuide || undefined,
      microsoftDocsUrl: setting.microsoftDocUrl || undefined,
      complianceCheck: latestCheck ? {
        status: latestCheck.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
        actualValue: latestCheck.actualValue,
        isCompliant: latestCheck.isCompliant,
        lastChecked: latestCheck.lastChecked,
        errorMessage: latestCheck.complianceMessage || undefined,
      } : undefined,
      mappedControls: setting.controlMappings.map(m => ({
        controlId: m.control.controlId,
        controlTitle: m.control.title,
        family: m.control.family,
      })),
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'getSettingDetail');
  }
}

// ============================================================================
// CONTROL-SPECIFIC ENDPOINTS
// ============================================================================

/**
 * GET /api/m365/control/:controlId/settings
 * Get all settings mapped to a specific control
 */
export async function getControlSettings(req: Request, res: Response): Promise<void> {
  try {
    const { controlId } = req.params;

    // Verify control exists
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: {
        id: true,
        controlId: true,
        title: true,
      },
    });

    if (!control) {
      sendNotFoundError(res, 'Control', controlId);
      return;
    }

    // Get settings mapped to this control
    const mappings = await prisma.controlSettingMapping.findMany({
      where: { controlId: control.id },
      include: {
        setting: {
          include: {
            complianceChecks: {
              orderBy: {
                lastChecked: 'desc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        confidence: 'asc', // High first (alphabetically)
      },
    });

    // Calculate summary
    const summary = {
      total: mappings.length,
      compliant: 0,
      nonCompliant: 0,
      notConfigured: 0,
      notChecked: 0,
    };

    const settings = mappings.map(m => {
      const latestCheck = m.setting.complianceChecks[0];
      let status = 'NOT_CHECKED';

      if (latestCheck) {
        status = latestCheck.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT';
      }

      if (status === 'COMPLIANT') summary.compliant++;
      else if (status === 'NON_COMPLIANT') summary.nonCompliant++;
      else if (status === 'NOT_CONFIGURED') summary.notConfigured++;
      else summary.notChecked++;

      return {
        id: m.setting.id.toString(),
        displayName: m.setting.displayName,
        policyType: m.setting.policyType,
        platform: m.setting.platform,
        confidence: m.confidence,
        complianceStatus: status as any,
        lastChecked: latestCheck?.lastChecked,
      };
    });

    const response: ControlSettingsResponse = {
      controlId: control.controlId,
      controlTitle: control.title,
      settings,
      summary,
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'getControlSettings');
  }
}

/**
 * GET /api/m365/control/:controlId/compliance
 * Get compliance summary for a specific control
 */
export async function getControlCompliance(req: Request, res: Response): Promise<void> {
  try {
    const { controlId } = req.params;

    // Get control to find its numeric ID
    const control = await prisma.control.findUnique({
      where: { controlId },
      select: {
        id: true,
        title: true,
      },
    });

    if (!control) {
      sendNotFoundError(res, 'Control', controlId);
      return;
    }

    // Get compliance summary
    const summary = await prisma.controlM365Compliance.findUnique({
      where: { controlId: control.id },
    });

    if (!summary) {
      sendNotFoundError(res, 'Control compliance summary', controlId);
      return;
    }

    const response: ControlComplianceResponse = {
      controlId: controlId,
      controlTitle: control.title,
      compliancePercentage: summary.compliancePercentage,
      settingsCount: summary.totalRequiredSettings,
      compliantCount: summary.compliantSettings,
      nonCompliantCount: summary.nonCompliantSettings,
      notConfiguredCount: summary.notConfiguredSettings,
      platformCoverage: {
        windows: summary.windowsCoverage > 0,
        ios: summary.iosCoverage > 0,
        android: summary.androidCoverage > 0,
      },
      confidenceBreakdown: {
        high: summary.highConfidenceCount,
        medium: summary.mediumConfidenceCount,
        low: summary.lowConfidenceCount,
      },
      lastCalculated: summary.lastCalculated,
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'getControlCompliance');
  }
}

// ============================================================================
// VALIDATION & COMPLIANCE OPERATIONS
// ============================================================================

/**
 * POST /api/m365/validate-settings
 * Trigger validation for settings
 * NOTE: This is a stub implementation - actual validation logic to be implemented
 */
export async function validateSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as ValidateSettingsRequest;
    const { settingIds } = body;

    const startTime = Date.now();

    // Stub implementation - returns mock data
    // TODO: Implement actual validation logic using validationEngine.service
    const response: ValidationResponse = {
      success: true,
      message: 'Validation endpoint available but not yet implemented',
      results: {
        totalSettings: settingIds?.length || 0,
        validated: 0,
        compliant: 0,
        nonCompliant: 0,
        notConfigured: 0,
        errors: 0,
      },
      duration: Date.now() - startTime,
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'validateSettings');
  }
}

/**
 * POST /api/m365/recalculate-compliance
 * Recalculate compliance scores for controls
 * NOTE: This is a stub implementation - actual calculation logic to be implemented
 */
export async function recalculateCompliance(_req: Request, res: Response): Promise<void> {
  try {
    const startTime = Date.now();

    // Stub implementation - returns mock data
    // TODO: Implement actual recalculation logic using complianceCalculation.service
    const response: ComplianceRecalculationResponse = {
      success: true,
      message: 'Recalculation endpoint available but not yet implemented',
      results: {
        totalControls: 0,
        updated: 0,
        failed: 0,
      },
      duration: Date.now() - startTime,
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'recalculateCompliance');
  }
}

// ============================================================================
// METADATA ENDPOINTS
// ============================================================================

/**
 * GET /api/m365/platforms
 * Get list of supported platforms
 */
export async function getPlatforms(_req: Request, res: Response): Promise<void> {
  try {
    const platforms = await prisma.m365Setting.findMany({
      select: {
        platform: true,
      },
      distinct: ['platform'],
      orderBy: {
        platform: 'asc',
      },
    });

    const platformList = platforms.map(p => p.platform);
    sendSuccess(res, platformList);
  } catch (error) {
    sendServerError(res, error as Error, 'getPlatforms');
  }
}

/**
 * GET /api/m365/policy-types
 * Get list of policy types
 */
export async function getPolicyTypes(_req: Request, res: Response): Promise<void> {
  try {
    const policyTypes = await prisma.m365Setting.findMany({
      select: {
        policyType: true,
      },
      distinct: ['policyType'],
      orderBy: {
        policyType: 'asc',
      },
    });

    const typeList = policyTypes.map(p => p.policyType);
    sendSuccess(res, typeList);
  } catch (error) {
    sendServerError(res, error as Error, 'getPolicyTypes');
  }
}
