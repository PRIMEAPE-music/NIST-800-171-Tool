/**
 * API Types for M365 Settings Endpoints
 * Defines request parameters, query options, and response formats
 */

import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * Query parameters for listing settings
 */
export const SettingsListQuerySchema = z.object({
  policyType: z.string().optional(),
  platform: z.string().optional(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SettingsListQuery = z.infer<typeof SettingsListQuerySchema>;

/**
 * Request body for validating settings
 */
export const ValidateSettingsRequestSchema = z.object({
  controlId: z.string().optional(),
  settingIds: z.array(z.string()).optional(),
  force: z.boolean().default(false),
});

export type ValidateSettingsRequest = z.infer<typeof ValidateSettingsRequestSchema>;

/**
 * Request body for recalculating compliance
 */
export const RecalculateComplianceRequestSchema = z.object({
  controlId: z.string().optional(),
  force: z.boolean().default(false),
});

export type RecalculateComplianceRequest = z.infer<typeof RecalculateComplianceRequestSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Setting list item (summary view)
 */
export interface SettingSummary {
  id: string;
  displayName: string;
  policyType: string;
  platform: string;
  confidence: string;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED' | 'NOT_CHECKED';
  lastChecked?: Date;
}

/**
 * Settings list response
 */
export interface SettingsListResponse {
  data: SettingSummary[];
  meta: PaginationMeta;
}

/**
 * Setting detail response
 */
export interface SettingDetailResponse {
  id: string;
  displayName: string;
  description: string;
  policyType: string;
  platform: string;
  settingPath: string;
  expectedValue: any;
  validationOperator: string;
  confidence: string;
  implementationGuide?: string;
  microsoftDocsUrl?: string;
  complianceCheck?: {
    status: string;
    actualValue: any;
    isCompliant: boolean;
    lastChecked: Date;
    errorMessage?: string;
  };
  mappedControls: {
    controlId: string;
    controlTitle: string;
    family: string;
  }[];
}

/**
 * Control settings response
 */
export interface ControlSettingsResponse {
  controlId: string;
  controlTitle: string;
  settings: SettingSummary[];
  summary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    notConfigured: number;
    notChecked: number;
  };
}

/**
 * Control compliance response
 */
export interface ControlComplianceResponse {
  controlId: string;
  controlTitle: string;
  compliancePercentage: number;
  settingsCount: number;
  compliantCount: number;
  nonCompliantCount: number;
  notConfiguredCount: number;
  platformCoverage: {
    windows: boolean;
    ios: boolean;
    android: boolean;
  };
  confidenceBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  lastCalculated: Date;
}

/**
 * Validation operation response
 */
export interface ValidationResponse {
  success: boolean;
  message: string;
  results: {
    totalSettings: number;
    validated: number;
    compliant: number;
    nonCompliant: number;
    notConfigured: number;
    errors: number;
  };
  duration: number; // milliseconds
}

/**
 * Compliance recalculation response
 */
export interface ComplianceRecalculationResponse {
  success: boolean;
  message: string;
  results: {
    totalControls: number;
    updated: number;
    failed: number;
  };
  duration: number; // milliseconds
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Generic API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: any;
}
