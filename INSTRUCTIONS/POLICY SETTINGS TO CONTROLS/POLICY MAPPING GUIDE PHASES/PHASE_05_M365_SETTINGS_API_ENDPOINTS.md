# Phase 5: M365 Settings API Endpoints

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 5 of 12 - M365 Settings API Endpoints  
**Dependencies:** Phases 3-4 (Validation Engine, Compliance Calculation)  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium

---

## 📋 PHASE OVERVIEW

### What This Phase Does

Creates comprehensive REST API endpoints to serve M365 settings data, compliance information, and trigger validation/calculation operations. This phase bridges the backend services (Phases 3-4) with the frontend UI (Phases 7-10).

### Key Deliverables

1. ✅ API routes file: `m365Settings.routes.ts`
2. ✅ Controller functions with business logic
3. ✅ Request validation using Zod schemas
4. ✅ Response formatting utilities
5. ✅ Error handling middleware
6. ✅ API documentation (JSDoc)
7. ✅ Integration with existing Express app

### API Endpoints Created

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/m365/settings` | List all settings with optional filters |
| `GET` | `/api/m365/settings/:id` | Get single setting with details |
| `GET` | `/api/m365/control/:controlId/settings` | Get all settings for a control |
| `GET` | `/api/m365/control/:controlId/compliance` | Get compliance summary for control |
| `POST` | `/api/m365/validate-settings` | Trigger validation for specific control/all |
| `POST` | `/api/m365/recalculate-compliance` | Recalculate compliance scores |
| `GET` | `/api/m365/platforms` | Get list of supported platforms |
| `GET` | `/api/m365/policy-types` | Get list of policy types |

---

## 🎯 OBJECTIVES

By the end of this phase:

- ✅ All M365 settings accessible via REST API
- ✅ Control-specific settings and compliance data retrievable
- ✅ Validation and compliance operations triggerable via API
- ✅ Request validation prevents malformed data
- ✅ Consistent error handling across all endpoints
- ✅ API documented for frontend integration
- ✅ TypeScript types ensure type safety

---

## 📚 PREREQUISITES

### Required Completions
- ✅ Phase 1: Database schema created
- ✅ Phase 2: Data imported (settings and mappings)
- ✅ Phase 3: Validation engine service implemented
- ✅ Phase 4: Compliance calculation service implemented

### Required Files
```
backend/services/
  ├── validationEngine.service.ts (Phase 3)
  └── complianceCalculation.service.ts (Phase 4)

backend/prisma/
  └── schema.prisma (with M365 models)
```

### Required Dependencies
```json
{
  "express": "^4.18.0",
  "zod": "^3.22.0",
  "@prisma/client": "^6.19.0"
}
```

---

## 📁 FILE STRUCTURE

### New Files Created This Phase
```
backend/
├── routes/
│   └── m365Settings.routes.ts      [NEW] - API route definitions
├── controllers/
│   └── m365Settings.controller.ts  [NEW] - Request handlers
├── middleware/
│   └── validateRequest.ts          [NEW] - Zod validation middleware
├── types/
│   └── m365Api.types.ts            [NEW] - API request/response types
└── utils/
    └── apiResponse.ts              [NEW] - Response formatting utilities
```

### Files Modified This Phase
```
backend/
└── index.ts                        [MODIFIED] - Register new routes
```

---

## 🔧 IMPLEMENTATION STEPS

### Step 1: Create API Types

Create TypeScript types for API requests and responses.

**File:** `backend/types/m365Api.types.ts`

```typescript
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
```

---

### Step 2: Create Response Utilities

Create utility functions for consistent API responses.

**File:** `backend/utils/apiResponse.ts`

```typescript
/**
 * API Response Utilities
 * Provides consistent response formatting across all endpoints
 */

import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/m365Api.types';

/**
 * Send successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: any,
  statusCode: number = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send error API response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  details?: any,
  statusCode: number = 400
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any
): void {
  sendError(res, 'VALIDATION_ERROR', message, details, 400);
}

/**
 * Send not found error response
 */
export function sendNotFoundError(
  res: Response,
  resource: string,
  id?: string
): void {
  const message = id 
    ? `${resource} with ID '${id}' not found`
    : `${resource} not found`;
  sendError(res, 'NOT_FOUND', message, undefined, 404);
}

/**
 * Send internal server error response
 */
export function sendServerError(
  res: Response,
  error: Error,
  context?: string
): void {
  console.error(`Server error${context ? ` (${context})` : ''}:`, error);
  
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : error.message;
    
  sendError(
    res,
    'INTERNAL_ERROR',
    message,
    process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined,
    500
  );
}
```

---

### Step 3: Create Request Validation Middleware

Create middleware to validate requests using Zod schemas.

**File:** `backend/middleware/validateRequest.ts`

```typescript
/**
 * Request Validation Middleware
 * Uses Zod schemas to validate request data
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { sendValidationError } from '../utils/apiResponse';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid request body', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Request validation failed');
      }
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid query parameters', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Query validation failed');
      }
    }
  };
}

/**
 * Validate request params against Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid URL parameters', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Parameter validation failed');
      }
    }
  };
}
```

---

### Step 4: Create Controller Functions

Create controller functions that handle the business logic for each endpoint.

**File:** `backend/controllers/m365Settings.controller.ts`

```typescript
/**
 * M365 Settings API Controllers
 * Request handlers for M365 settings and compliance endpoints
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  SettingsListQuery,
  ValidateSettingsRequest,
  RecalculateComplianceRequest,
  SettingsListResponse,
  SettingDetailResponse,
  ControlSettingsResponse,
  ControlComplianceResponse,
  ValidationResponse,
  ComplianceRecalculationResponse,
} from '../types/m365Api.types';
import { sendSuccess, sendError, sendNotFoundError, sendServerError } from '../utils/apiResponse';
import { validateSetting, validateSettingsForControl } from '../services/validationEngine.service';
import { calculateControlCompliance, recalculateAllCompliance } from '../services/complianceCalculation.service';

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
    const query = req.query as SettingsListQuery;
    const { policyType, platform, confidence, search, limit, offset } = query;

    // Build WHERE clause
    const where: any = {};
    
    if (policyType) {
      where.policyType = policyType;
    }
    
    if (platform) {
      where.platform = platform;
    }
    
    if (confidence) {
      where.confidence = confidence;
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
          complianceCheck: {
            select: {
              status: true,
              lastChecked: true,
            },
          },
        },
        orderBy: [
          { confidence: 'asc' }, // HIGH first
          { displayName: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.m365Setting.count({ where }),
    ]);

    // Format response
    const response: SettingsListResponse = {
      data: settings.map(s => ({
        id: s.id,
        displayName: s.displayName,
        policyType: s.policyType,
        platform: s.platform,
        confidence: s.confidence,
        complianceStatus: s.complianceCheck?.status as any,
        lastChecked: s.complianceCheck?.lastChecked,
      })),
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
    const { id } = req.params;

    const setting = await prisma.m365Setting.findUnique({
      where: { id },
      include: {
        complianceCheck: true,
        mappings: {
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
      sendNotFoundError(res, 'Setting', id);
      return;
    }

    // Format response
    const response: SettingDetailResponse = {
      id: setting.id,
      displayName: setting.displayName,
      description: setting.description,
      policyType: setting.policyType,
      platform: setting.platform,
      settingPath: setting.settingPath,
      expectedValue: setting.expectedValue,
      validationOperator: setting.validationOperator,
      confidence: setting.confidence,
      implementationGuide: setting.implementationGuide || undefined,
      microsoftDocsUrl: setting.microsoftDocsUrl || undefined,
      complianceCheck: setting.complianceCheck ? {
        status: setting.complianceCheck.status,
        actualValue: setting.complianceCheck.actualValue,
        isCompliant: setting.complianceCheck.isCompliant,
        lastChecked: setting.complianceCheck.lastChecked,
        errorMessage: setting.complianceCheck.errorMessage || undefined,
      } : undefined,
      mappedControls: setting.mappings.map(m => ({
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
      where: { controlId },
      include: {
        setting: {
          include: {
            complianceCheck: {
              select: {
                status: true,
                lastChecked: true,
              },
            },
          },
        },
      },
      orderBy: {
        setting: {
          confidence: 'asc', // HIGH first
        },
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
      const status = m.setting.complianceCheck?.status || 'NOT_CHECKED';
      
      if (status === 'COMPLIANT') summary.compliant++;
      else if (status === 'NON_COMPLIANT') summary.nonCompliant++;
      else if (status === 'NOT_CONFIGURED') summary.notConfigured++;
      else summary.notChecked++;

      return {
        id: m.setting.id,
        displayName: m.setting.displayName,
        policyType: m.setting.policyType,
        platform: m.setting.platform,
        confidence: m.setting.confidence,
        complianceStatus: status as any,
        lastChecked: m.setting.complianceCheck?.lastChecked,
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

    // Get compliance summary
    const summary = await prisma.controlM365Compliance.findUnique({
      where: { controlId },
      include: {
        control: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!summary) {
      sendNotFoundError(res, 'Control compliance summary', controlId);
      return;
    }

    const response: ControlComplianceResponse = {
      controlId: summary.controlId,
      controlTitle: summary.control.title,
      compliancePercentage: summary.compliancePercentage,
      settingsCount: summary.totalSettings,
      compliantCount: summary.compliantSettings,
      nonCompliantCount: summary.nonCompliantSettings,
      notConfiguredCount: summary.notConfiguredSettings,
      platformCoverage: {
        windows: summary.hasWindowsSettings,
        ios: summary.hasIOSSettings,
        android: summary.hasAndroidSettings,
      },
      confidenceBreakdown: {
        high: summary.highConfidenceSettings,
        medium: summary.mediumConfidenceSettings,
        low: summary.lowConfidenceSettings,
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
 */
export async function validateSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as ValidateSettingsRequest;
    const { controlId, settingIds, force } = body;

    const startTime = Date.now();
    let totalSettings = 0;
    let validated = 0;
    let compliant = 0;
    let nonCompliant = 0;
    let notConfigured = 0;
    let errors = 0;

    if (controlId) {
      // Validate all settings for a specific control
      const results = await validateSettingsForControl(controlId, force);
      totalSettings = results.length;
      
      for (const result of results) {
        validated++;
        if (result.status === 'COMPLIANT') compliant++;
        else if (result.status === 'NON_COMPLIANT') nonCompliant++;
        else if (result.status === 'NOT_CONFIGURED') notConfigured++;
        else errors++;
      }
    } else if (settingIds && settingIds.length > 0) {
      // Validate specific settings
      totalSettings = settingIds.length;
      
      for (const settingId of settingIds) {
        try {
          const result = await validateSetting(settingId, force);
          validated++;
          if (result.status === 'COMPLIANT') compliant++;
          else if (result.status === 'NON_COMPLIANT') nonCompliant++;
          else if (result.status === 'NOT_CONFIGURED') notConfigured++;
        } catch (error) {
          errors++;
          console.error(`Error validating setting ${settingId}:`, error);
        }
      }
    } else {
      // Validate all settings
      const allSettings = await prisma.m365Setting.findMany({
        select: { id: true },
      });
      
      totalSettings = allSettings.length;
      
      for (const setting of allSettings) {
        try {
          const result = await validateSetting(setting.id, force);
          validated++;
          if (result.status === 'COMPLIANT') compliant++;
          else if (result.status === 'NON_COMPLIANT') nonCompliant++;
          else if (result.status === 'NOT_CONFIGURED') notConfigured++;
        } catch (error) {
          errors++;
          console.error(`Error validating setting ${setting.id}:`, error);
        }
      }
    }

    const duration = Date.now() - startTime;

    const response: ValidationResponse = {
      success: true,
      message: `Validated ${validated} of ${totalSettings} settings`,
      results: {
        totalSettings,
        validated,
        compliant,
        nonCompliant,
        notConfigured,
        errors,
      },
      duration,
    };

    sendSuccess(res, response);
  } catch (error) {
    sendServerError(res, error as Error, 'validateSettings');
  }
}

/**
 * POST /api/m365/recalculate-compliance
 * Recalculate compliance scores for controls
 */
export async function recalculateCompliance(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as RecalculateComplianceRequest;
    const { controlId, force } = body;

    const startTime = Date.now();
    let totalControls = 0;
    let updated = 0;
    let failed = 0;

    if (controlId) {
      // Recalculate for specific control
      totalControls = 1;
      try {
        await calculateControlCompliance(controlId, force);
        updated++;
      } catch (error) {
        failed++;
        console.error(`Error calculating compliance for control ${controlId}:`, error);
      }
    } else {
      // Recalculate for all controls
      const results = await recalculateAllCompliance(force);
      totalControls = results.total;
      updated = results.updated;
      failed = results.failed;
    }

    const duration = Date.now() - startTime;

    const response: ComplianceRecalculationResponse = {
      success: true,
      message: `Recalculated compliance for ${updated} of ${totalControls} controls`,
      results: {
        totalControls,
        updated,
        failed,
      },
      duration,
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
export async function getPlatforms(req: Request, res: Response): Promise<void> {
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
export async function getPolicyTypes(req: Request, res: Response): Promise<void> {
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
```

---

### Step 5: Create API Routes

Define the Express routes and connect them to controllers.

**File:** `backend/routes/m365Settings.routes.ts`

```typescript
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
```

---

### Step 6: Register Routes in Main App

Update the main Express app to register the new routes.

**File:** `backend/index.ts`

🔍 **FIND:**
```typescript
// Import routes
import controlRoutes from './routes/controls.routes';
import assessmentRoutes from './routes/assessments.routes';
import policyRoutes from './routes/policies.routes';
```

✏️ **REPLACE WITH:**
```typescript
// Import routes
import controlRoutes from './routes/controls.routes';
import assessmentRoutes from './routes/assessments.routes';
import policyRoutes from './routes/policies.routes';
import m365SettingsRoutes from './routes/m365Settings.routes';
```

🔍 **FIND:**
```typescript
// Register routes
app.use('/api/controls', controlRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/policies', policyRoutes);
```

✏️ **REPLACE WITH:**
```typescript
// Register routes
app.use('/api/controls', controlRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/m365', m365SettingsRoutes);
```

---

## ✅ VERIFICATION PROCEDURES

### Step 1: TypeScript Compilation

```bash
# Navigate to backend directory
cd backend

# Compile TypeScript
npm run build

# Should compile with no errors
```

**Expected Output:**
```
✓ Compiled successfully
```

---

### Step 2: Start Development Server

```bash
# Start backend server
npm run dev
```

**Expected Output:**
```
Server running on http://localhost:3001
Connected to database
```

---

### Step 3: Test API Endpoints

#### Test 1: List All Settings

```bash
curl -X GET "http://localhost:3001/api/m365/settings?limit=5"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "displayName": "Password Policy - Minimum Length",
      "policyType": "Conditional Access",
      "platform": "All",
      "confidence": "HIGH",
      "complianceStatus": "NOT_CHECKED",
      "lastChecked": null
    }
    // ... 4 more settings
  ],
  "meta": {
    "total": 300,
    "limit": 5,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### Test 2: Get Setting Detail

```bash
# Replace {settingId} with actual ID from previous response
curl -X GET "http://localhost:3001/api/m365/settings/{settingId}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "displayName": "Password Policy - Minimum Length",
    "description": "Enforce minimum password length",
    "policyType": "Conditional Access",
    "platform": "All",
    "settingPath": "properties.passwordPolicies.minimumLength",
    "expectedValue": 14,
    "validationOperator": ">=",
    "confidence": "HIGH",
    "implementationGuide": "Configure in Azure AD...",
    "microsoftDocsUrl": "https://docs.microsoft.com/...",
    "mappedControls": [
      {
        "controlId": "3.5.7",
        "controlTitle": "Use multifactor authentication...",
        "family": "Identification and Authentication"
      }
    ]
  }
}
```

---

#### Test 3: Get Control Settings

```bash
curl -X GET "http://localhost:3001/api/m365/control/3.5.7/settings"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "controlId": "3.5.7",
    "controlTitle": "Use multifactor authentication...",
    "settings": [
      {
        "id": "...",
        "displayName": "MFA Requirement",
        "policyType": "Conditional Access",
        "platform": "All",
        "confidence": "HIGH",
        "complianceStatus": "NOT_CHECKED"
      }
    ],
    "summary": {
      "total": 5,
      "compliant": 0,
      "nonCompliant": 0,
      "notConfigured": 0,
      "notChecked": 5
    }
  }
}
```

---

#### Test 4: Get Control Compliance

```bash
curl -X GET "http://localhost:3001/api/m365/control/3.5.7/compliance"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "controlId": "3.5.7",
    "controlTitle": "Use multifactor authentication...",
    "compliancePercentage": 0,
    "settingsCount": 5,
    "compliantCount": 0,
    "nonCompliantCount": 0,
    "notConfiguredCount": 0,
    "platformCoverage": {
      "windows": true,
      "ios": true,
      "android": false
    },
    "confidenceBreakdown": {
      "high": 3,
      "medium": 2,
      "low": 0
    },
    "lastCalculated": "2024-11-17T..."
  }
}
```

---

#### Test 5: Trigger Validation

```bash
curl -X POST "http://localhost:3001/api/m365/validate-settings" \
  -H "Content-Type: application/json" \
  -d '{"controlId": "3.5.7", "force": true}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Validated 5 of 5 settings",
    "results": {
      "totalSettings": 5,
      "validated": 5,
      "compliant": 2,
      "nonCompliant": 1,
      "notConfigured": 2,
      "errors": 0
    },
    "duration": 1234
  }
}
```

---

#### Test 6: Recalculate Compliance

```bash
curl -X POST "http://localhost:3001/api/m365/recalculate-compliance" \
  -H "Content-Type: application/json" \
  -d '{"controlId": "3.5.7"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Recalculated compliance for 1 of 1 controls",
    "results": {
      "totalControls": 1,
      "updated": 1,
      "failed": 0
    },
    "duration": 456
  }
}
```

---

#### Test 7: Get Platforms

```bash
curl -X GET "http://localhost:3001/api/m365/platforms"
```

**Expected Response:**
```json
{
  "success": true,
  "data": ["All", "Windows", "iOS", "Android", "macOS"]
}
```

---

#### Test 8: Get Policy Types

```bash
curl -X GET "http://localhost:3001/api/m365/policy-types"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    "Conditional Access",
    "Device Compliance",
    "Device Configuration",
    "Information Protection",
    "Security Defaults"
  ]
}
```

---

### Step 4: Test Error Handling

#### Test Invalid Query Parameters

```bash
curl -X GET "http://localhost:3001/api/m365/settings?limit=9999"
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "errors": [
        {
          "path": "limit",
          "message": "Number must be less than or equal to 1000"
        }
      ]
    }
  }
}
```

---

#### Test Non-Existent Setting

```bash
curl -X GET "http://localhost:3001/api/m365/settings/invalid-id"
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Setting with ID 'invalid-id' not found"
  }
}
```

---

#### Test Invalid Request Body

```bash
curl -X POST "http://localhost:3001/api/m365/validate-settings" \
  -H "Content-Type: application/json" \
  -d '{"force": "yes"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "errors": [
        {
          "path": "force",
          "message": "Expected boolean, received string"
        }
      ]
    }
  }
}
```

---

## 🎯 COMPLETION CHECKLIST

Before proceeding to Phase 6, verify:

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] No ESLint warnings
- [ ] Consistent code formatting
- [ ] JSDoc comments on all exported functions

### Functionality
- [ ] All 8 endpoints respond correctly
- [ ] Query parameter filtering works
- [ ] Pagination functions properly
- [ ] Control-specific endpoints return correct data
- [ ] Validation operations execute successfully
- [ ] Compliance recalculation works
- [ ] Metadata endpoints return lists

### Error Handling
- [ ] Invalid query parameters rejected
- [ ] Non-existent resources return 404
- [ ] Malformed request bodies rejected
- [ ] Server errors logged and handled gracefully
- [ ] All errors return consistent format

### Data Integrity
- [ ] Database queries use correct relations
- [ ] Responses include all required fields
- [ ] Pagination metadata accurate
- [ ] Counts and summaries calculated correctly

### Documentation
- [ ] All endpoints documented with JSDoc
- [ ] API types defined and exported
- [ ] Response formats consistent
- [ ] Example requests provided

---

## 🐛 TROUBLESHOOTING

### Issue: Routes not responding

**Symptoms:**
```
404 Not Found for /api/m365/settings
```

**Solutions:**
1. Verify routes registered in `backend/index.ts`
2. Check route path matches exactly: `/api/m365`
3. Ensure server restarted after changes
4. Check for TypeScript compilation errors

---

### Issue: Validation errors on valid requests

**Symptoms:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters"
  }
}
```

**Solutions:**
1. Check Zod schema definitions match expected types
2. Verify query parameter types (strings vs numbers)
3. Use `z.coerce.number()` for numeric query params
4. Check enum values match exactly

---

### Issue: Database query errors

**Symptoms:**
```
PrismaClientKnownRequestError: Unknown field
```

**Solutions:**
1. Verify field names match Prisma schema exactly
2. Check relation names correct
3. Ensure includes/selects valid
4. Run `npx prisma generate` to update client

---

### Issue: Performance problems

**Symptoms:**
- Slow response times
- Timeouts on large datasets

**Solutions:**
1. Add database indexes on frequently queried fields
2. Limit include depth (avoid deep nesting)
3. Use select to return only needed fields
4. Implement caching for expensive queries
5. Consider pagination for large result sets

---

### Issue: TypeScript type errors

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**
1. Ensure API types match Prisma types
2. Use type assertions sparingly (`as` keyword)
3. Define proper interfaces for all responses
4. Check zod schema inference matches types

---

## 📊 PERFORMANCE CONSIDERATIONS

### Query Optimization

1. **Use Select Statements:**
   ```typescript
   // Instead of:
   const settings = await prisma.m365Setting.findMany({
     include: { everything: true }
   });

   // Use:
   const settings = await prisma.m365Setting.findMany({
     select: {
       id: true,
       displayName: true,
       policyType: true,
       // Only fields you need
     }
   });
   ```

2. **Implement Pagination:**
   - Always use `limit` and `offset`
   - Default to reasonable page sizes (100 items)
   - Return pagination metadata

3. **Batch Operations:**
   - Use `Promise.all()` for parallel queries
   - Consider transaction batching for writes

---

### Caching Strategy

For future optimization:

```typescript
// Example: Cache platform/policy type lists
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let platformCache: { data: string[], timestamp: number } | null = null;

export async function getPlatformsCached() {
  if (platformCache && Date.now() - platformCache.timestamp < CACHE_TTL) {
    return platformCache.data;
  }
  
  const data = await fetchPlatformsFromDB();
  platformCache = { data, timestamp: Date.now() };
  return data;
}
```

---

## 📈 METRICS & MONITORING

### Key Metrics to Track

1. **Response Times:**
   - List endpoints: < 500ms
   - Detail endpoints: < 200ms
   - Validation operations: < 30s
   - Compliance calculation: < 60s

2. **Error Rates:**
   - Target: < 1% of requests
   - Monitor 4xx vs 5xx errors
   - Track validation failures

3. **Usage Patterns:**
   - Most frequently accessed endpoints
   - Common query parameters
   - Peak usage times

---

### Logging Best Practices

```typescript
// Add to each controller
console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
  query: req.query,
  params: req.params,
  userId: req.user?.id, // If auth implemented
});
```

---

## 🚀 NEXT STEPS

### Immediate (Phase 6)
1. **Policy Sync Integration**
   - Update `policySync.service.ts`
   - Auto-trigger validation after sync
   - Log compliance changes

### Short Term (Phase 7)
1. **Frontend Integration**
   - Create API client service
   - Build M365 Settings Tab component
   - Connect to these endpoints

### Future Enhancements
1. **API Improvements:**
   - Add bulk operations endpoint
   - Implement webhooks for status changes
   - Add export endpoints (CSV, PDF)
   - Version API endpoints

2. **Performance:**
   - Implement response caching
   - Add database indexes
   - Optimize complex queries

3. **Security:**
   - Add authentication middleware
   - Implement rate limiting
   - Add API key support
   - Audit logging

---

## 📝 API DOCUMENTATION

### Quick Reference

#### GET /api/m365/settings
Lists all settings with filtering and pagination.

**Query Parameters:**
- `policyType` (string, optional) - Filter by policy type
- `platform` (string, optional) - Filter by platform
- `confidence` (enum, optional) - Filter by confidence: HIGH, MEDIUM, LOW
- `search` (string, optional) - Search in name, description, path
- `limit` (number, optional) - Results per page (max 1000, default 100)
- `offset` (number, optional) - Skip N results (default 0)

**Response:** Settings list with pagination metadata

---

#### GET /api/m365/settings/:id
Gets detailed information about a specific setting.

**Parameters:**
- `id` (string) - Setting ID

**Response:** Complete setting details with compliance check and mapped controls

---

#### GET /api/m365/control/:controlId/settings
Gets all settings mapped to a control.

**Parameters:**
- `controlId` (string) - NIST Control ID (e.g., "3.5.7")

**Response:** Settings list with summary counts

---

#### GET /api/m365/control/:controlId/compliance
Gets compliance summary for a control.

**Parameters:**
- `controlId` (string) - NIST Control ID

**Response:** Compliance metrics and breakdowns

---

#### POST /api/m365/validate-settings
Triggers validation of settings.

**Request Body:**
```json
{
  "controlId": "3.5.7",     // Optional: validate specific control
  "settingIds": ["id1"],     // Optional: validate specific settings
  "force": false             // Optional: force revalidation
}
```

**Response:** Validation results with counts and duration

---

#### POST /api/m365/recalculate-compliance
Recalculates compliance scores.

**Request Body:**
```json
{
  "controlId": "3.5.7",  // Optional: specific control
  "force": false          // Optional: force recalculation
}
```

**Response:** Recalculation results with counts and duration

---

#### GET /api/m365/platforms
Gets list of all platforms.

**Response:** Array of platform names

---

#### GET /api/m365/policy-types
Gets list of all policy types.

**Response:** Array of policy type names

---

## 🎓 SUMMARY

### What We Built

1. ✅ **8 REST API Endpoints** - Complete CRUD operations for M365 settings
2. ✅ **Request Validation** - Zod schemas prevent malformed requests
3. ✅ **Error Handling** - Consistent error responses across all endpoints
4. ✅ **Response Formatting** - Standardized success/error format
5. ✅ **Type Safety** - Full TypeScript coverage
6. ✅ **Documentation** - JSDoc comments and this guide

### Key Features

- **Filtering & Pagination** - Efficient data retrieval
- **Control-Specific Queries** - Direct access to control data
- **Operation Triggers** - API-driven validation and compliance
- **Metadata Endpoints** - Support for UI dropdowns and filters
- **Validation Middleware** - Automatic request validation
- **Consistent Responses** - Predictable API behavior

### Files Created

1. `backend/types/m365Api.types.ts` - API type definitions
2. `backend/utils/apiResponse.ts` - Response utilities
3. `backend/middleware/validateRequest.ts` - Validation middleware
4. `backend/controllers/m365Settings.controller.ts` - Request handlers
5. `backend/routes/m365Settings.routes.ts` - Route definitions

### Integration Points

- **Phase 3:** Uses validation engine service
- **Phase 4:** Uses compliance calculation service
- **Phase 6:** Will be called by policy sync
- **Phase 7:** Will be consumed by frontend components

---

## ✅ PHASE 5 COMPLETE!

You now have a fully functional REST API for M365 settings and compliance data!

**Next Phase:** [Phase 6 - Policy Sync Integration](PHASE_06_POLICY_SYNC_INTEGRATION.md)

---

**Phase 5 Implementation Guide**  
**Version:** 1.0  
**Created:** 2024-11-17  
**Status:** Ready for Implementation  
**Optimized For:** Claude Code Execution

---

**END OF PHASE 5**
