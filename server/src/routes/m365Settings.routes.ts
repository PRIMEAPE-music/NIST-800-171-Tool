/**
 * M365 Settings API Routes
 * Defines all routes for M365 settings and compliance endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  listSettings,
  getSettingDetail,
  getControlSettings,
  getControlCompliance,
  validateSettings,
  recalculateCompliance,
  getPlatforms,
  getPolicyTypes,
} from '../controllers/m365Settings.controller';
import { validateQuery, validateBody, validateParams } from '../middleware/validateRequest';
import {
  SettingsListQuerySchema,
  ValidateSettingsRequestSchema,
  RecalculateComplianceRequestSchema,
} from '../types/m365Api.types';

const router = Router();

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/m365/settings
 * @desc    List all M365 settings with optional filtering
 * @access  Public
 * @query   policyType, platform, confidence, search, limit, offset
 */
router.get(
  '/settings',
  validateQuery(SettingsListQuerySchema),
  listSettings
);

/**
 * @route   GET /api/m365/settings/:id
 * @desc    Get detailed information about a specific setting
 * @access  Public
 * @param   id - Setting ID
 */
router.get(
  '/settings/:id',
  validateParams(z.object({ id: z.string() })),
  getSettingDetail
);

// ============================================================================
// CONTROL-SPECIFIC ROUTES
// ============================================================================

/**
 * @route   GET /api/m365/control/:controlId/settings
 * @desc    Get all settings mapped to a specific control
 * @access  Public
 * @param   controlId - NIST Control ID (e.g., "3.1.1")
 */
router.get(
  '/control/:controlId/settings',
  validateParams(z.object({ controlId: z.string() })),
  getControlSettings
);

/**
 * @route   GET /api/m365/control/:controlId/compliance
 * @desc    Get compliance summary for a specific control
 * @access  Public
 * @param   controlId - NIST Control ID (e.g., "3.1.1")
 */
router.get(
  '/control/:controlId/compliance',
  validateParams(z.object({ controlId: z.string() })),
  getControlCompliance
);

// ============================================================================
// VALIDATION & COMPLIANCE OPERATIONS
// ============================================================================

/**
 * @route   POST /api/m365/validate-settings
 * @desc    Trigger validation for settings
 * @access  Public
 * @body    { controlId?, settingIds?, force? }
 */
router.post(
  '/validate-settings',
  validateBody(ValidateSettingsRequestSchema),
  validateSettings
);

/**
 * @route   POST /api/m365/recalculate-compliance
 * @desc    Recalculate compliance scores for controls
 * @access  Public
 * @body    { controlId?, force? }
 */
router.post(
  '/recalculate-compliance',
  validateBody(RecalculateComplianceRequestSchema),
  recalculateCompliance
);

// ============================================================================
// METADATA ROUTES
// ============================================================================

/**
 * @route   GET /api/m365/platforms
 * @desc    Get list of supported platforms
 * @access  Public
 */
router.get('/platforms', getPlatforms);

/**
 * @route   GET /api/m365/policy-types
 * @desc    Get list of policy types
 * @access  Public
 */
router.get('/policy-types', getPolicyTypes);

export default router;
