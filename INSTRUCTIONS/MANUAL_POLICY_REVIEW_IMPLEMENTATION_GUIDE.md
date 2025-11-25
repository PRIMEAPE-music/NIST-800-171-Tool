# Manual Policy Settings Review Feature - Implementation Guide

## Overview

This guide implements a comprehensive manual review system for M365 policy settings that allows users to:
1. Compare policy settings against the M365Setting catalog (by odataType/template)
2. Manually associate settings with specific policies
3. Override expected values and compliance status with rationale
4. Track which settings have been manually reviewed

---

## Phase 1: Database Schema Changes

### File: `server/prisma/schema.prisma`

Add the following model after the existing `SettingComplianceCheck` model:

```prisma
// ============================================================================
// Manual Setting Reviews (User Overrides & Annotations)
// ============================================================================

model ManualSettingReview {
  id              Int       @id @default(autoincrement())
  
  // Foreign Keys
  settingId       Int       @map("setting_id")           // FK to M365Setting
  policyId        Int?      @map("policy_id")            // FK to M365Policy (manually associated)
  controlId       Int?      @map("control_id")           // FK to Control (context where review was made)
  
  // Review Status
  isReviewed      Boolean   @default(false) @map("is_reviewed")
  reviewedAt      DateTime? @map("reviewed_at")
  reviewedBy      String?   @map("reviewed_by")          // Username or identifier
  
  // Manual Compliance Override
  manualComplianceStatus String? @map("manual_compliance_status") // 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT'
  
  // Value Overrides (optional)
  manualExpectedValue    String?  @map("manual_expected_value")
  manualActualValue      String?  @map("manual_actual_value")
  
  // Required Rationale
  rationale       String   // Required - explains why the override/review was made
  
  // Audit Trail
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relations
  setting         M365Setting @relation(fields: [settingId], references: [id], onDelete: Cascade)
  policy          M365Policy? @relation(fields: [policyId], references: [id], onDelete: SetNull)
  control         Control?    @relation(fields: [controlId], references: [id], onDelete: SetNull)
  
  // Indexes
  @@unique([settingId, policyId]) // One review per setting-policy combination
  @@index([settingId])
  @@index([policyId])
  @@index([controlId])
  @@index([isReviewed])
  @@index([manualComplianceStatus])
  @@map("manual_setting_reviews")
}
```

### Update existing models to add relations:

#### Add to `M365Setting` model:
```prisma
// Add this line to the M365Setting model's relations section:
manualReviews   ManualSettingReview[]
```

#### Add to `M365Policy` model:
```prisma
// Add this line to the M365Policy model's relations section:
manualReviews   ManualSettingReview[]
```

#### Add to `Control` model:
```prisma
// Add this line to the Control model's relations section:
manualSettingReviews ManualSettingReview[]
```

### Run Migration

```bash
cd server
npx prisma migrate dev --name add_manual_setting_reviews
npx prisma generate
```

---

## Phase 2: TypeScript Types

### File: `server/src/types/manualReview.types.ts` (NEW FILE)

```typescript
// server/src/types/manualReview.types.ts

export type ManualComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

export interface ManualSettingReviewCreate {
  settingId: number;
  policyId?: number;
  controlId?: number;
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale: string; // Required
  reviewedBy?: string;
}

export interface ManualSettingReviewUpdate {
  isReviewed?: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale?: string;
  reviewedBy?: string;
}

export interface ManualSettingReviewResponse {
  id: number;
  settingId: number;
  policyId: number | null;
  controlId: number | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  manualComplianceStatus: ManualComplianceStatus | null;
  manualExpectedValue: string | null;
  manualActualValue: string | null;
  rationale: string;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  setting?: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
  };
  policy?: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
  };
}

export interface PolicySettingsComparisonResult {
  policy: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
    templateFamily: string | null;
  };
  // Settings from catalog that match this policy's template
  catalogSettings: Array<{
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string;
    status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN';
    actualValue: string | null;
    isCompliant: boolean | null;
    manualReview: ManualSettingReviewResponse | null;
  }>;
  // Settings found in policy but not in catalog
  uncataloguedSettings: Array<{
    path: string;
    value: any;
  }>;
  summary: {
    totalCatalogSettings: number;
    configuredCount: number;
    notConfiguredCount: number;
    uncataloguedCount: number;
    reviewedCount: number;
  };
}
```

### File: `client/src/types/manualReview.types.ts` (NEW FILE)

```typescript
// client/src/types/manualReview.types.ts

export type ManualComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

export interface ManualSettingReview {
  id: number;
  settingId: number;
  policyId: number | null;
  controlId: number | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  manualComplianceStatus: ManualComplianceStatus | null;
  manualExpectedValue: string | null;
  manualActualValue: string | null;
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualSettingReviewCreate {
  settingId: number;
  policyId?: number;
  controlId?: number;
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale: string;
}

export interface ManualSettingReviewUpdate {
  isReviewed?: boolean;
  manualComplianceStatus?: ManualComplianceStatus;
  manualExpectedValue?: string;
  manualActualValue?: string;
  rationale?: string;
}

export interface PolicyForSelector {
  id: number;
  policyName: string;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyDescription: string | null;
  odataType: string | null;
  templateFamily: string | null;
  isActive: boolean;
  lastSynced: string;
}

export interface CatalogSettingComparison {
  id: number;
  displayName: string;
  settingPath: string;
  expectedValue: string;
  description: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN';
  actualValue: string | null;
  isCompliant: boolean | null;
  manualReview: ManualSettingReview | null;
}

export interface PolicySettingsComparison {
  policy: {
    id: number;
    policyName: string;
    policyType: string;
    odataType: string | null;
    templateFamily: string | null;
  };
  catalogSettings: CatalogSettingComparison[];
  uncataloguedSettings: Array<{
    path: string;
    value: any;
  }>;
  summary: {
    totalCatalogSettings: number;
    configuredCount: number;
    notConfiguredCount: number;
    uncataloguedCount: number;
    reviewedCount: number;
  };
}

// For the association modal
export interface SettingAssociationData {
  setting: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
    policyType: string;
    platform: string;
  };
  selectedPolicy: PolicyForSelector | null;
  policySettings: Record<string, any> | null;
  manualExpectedValue: string;
  manualComplianceStatus: ManualComplianceStatus | null;
  rationale: string;
}
```

---

## Phase 3: Backend Service

### File: `server/src/services/manualReview.service.ts` (NEW FILE)

```typescript
// server/src/services/manualReview.service.ts

import { PrismaClient } from '@prisma/client';
import {
  ManualSettingReviewCreate,
  ManualSettingReviewUpdate,
  ManualSettingReviewResponse,
  PolicySettingsComparisonResult,
} from '../types/manualReview.types';

const prisma = new PrismaClient();

class ManualReviewService {
  /**
   * Create or update a manual review for a setting
   */
  async upsertReview(data: ManualSettingReviewCreate): Promise<ManualSettingReviewResponse> {
    const { settingId, policyId, ...reviewData } = data;

    const review = await prisma.manualSettingReview.upsert({
      where: {
        settingId_policyId: {
          settingId,
          policyId: policyId ?? 0, // Use 0 for null to satisfy unique constraint
        },
      },
      create: {
        settingId,
        policyId: policyId || null,
        controlId: reviewData.controlId || null,
        isReviewed: reviewData.isReviewed,
        reviewedAt: reviewData.isReviewed ? new Date() : null,
        reviewedBy: reviewData.reviewedBy || null,
        manualComplianceStatus: reviewData.manualComplianceStatus || null,
        manualExpectedValue: reviewData.manualExpectedValue || null,
        manualActualValue: reviewData.manualActualValue || null,
        rationale: reviewData.rationale,
      },
      update: {
        isReviewed: reviewData.isReviewed,
        reviewedAt: reviewData.isReviewed ? new Date() : null,
        reviewedBy: reviewData.reviewedBy || null,
        manualComplianceStatus: reviewData.manualComplianceStatus || null,
        manualExpectedValue: reviewData.manualExpectedValue || null,
        manualActualValue: reviewData.manualActualValue || null,
        rationale: reviewData.rationale,
        controlId: reviewData.controlId || undefined,
      },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
    });

    return this.mapToResponse(review);
  }

  /**
   * Get a manual review by setting and policy
   */
  async getReview(settingId: number, policyId?: number): Promise<ManualSettingReviewResponse | null> {
    const review = await prisma.manualSettingReview.findUnique({
      where: {
        settingId_policyId: {
          settingId,
          policyId: policyId ?? 0,
        },
      },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
    });

    return review ? this.mapToResponse(review) : null;
  }

  /**
   * Get all reviews for a setting
   */
  async getReviewsForSetting(settingId: number): Promise<ManualSettingReviewResponse[]> {
    const reviews = await prisma.manualSettingReview.findMany({
      where: { settingId },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reviews.map(this.mapToResponse);
  }

  /**
   * Get all reviews for a control
   */
  async getReviewsForControl(controlId: number): Promise<ManualSettingReviewResponse[]> {
    const reviews = await prisma.manualSettingReview.findMany({
      where: { controlId },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
          },
        },
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            odataType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reviews.map(this.mapToResponse);
  }

  /**
   * Delete a manual review
   */
  async deleteReview(id: number): Promise<void> {
    await prisma.manualSettingReview.delete({
      where: { id },
    });
  }

  /**
   * Get all policies for selector (with search/filter)
   */
  async getPoliciesForSelector(params: {
    searchTerm?: string;
    policyType?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const where: any = {};

    if (params.searchTerm) {
      where.OR = [
        { policyName: { contains: params.searchTerm, mode: 'insensitive' } },
        { policyDescription: { contains: params.searchTerm, mode: 'insensitive' } },
      ];
    }

    if (params.policyType && params.policyType !== 'all') {
      where.policyType = params.policyType;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const policies = await prisma.m365Policy.findMany({
      where,
      select: {
        id: true,
        policyName: true,
        policyType: true,
        policyDescription: true,
        odataType: true,
        templateFamily: true,
        isActive: true,
        lastSynced: true,
      },
      orderBy: { policyName: 'asc' },
    });

    return policies;
  }

  /**
   * Get policy settings comparison - compares policy against catalog
   */
  async getPolicySettingsComparison(policyId: number): Promise<PolicySettingsComparisonResult> {
    // Get the policy
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Parse policy data
    let policyData: Record<string, any> = {};
    try {
      policyData = JSON.parse(policy.policyData);
    } catch {
      policyData = {};
    }

    // Get catalog settings that match this policy's template
    const catalogSettings = await prisma.m365Setting.findMany({
      where: {
        isActive: true,
        OR: [
          { policyTemplate: policy.odataType },
          { policyType: policy.policyType, policyTemplate: null }, // Fallback to type match
        ],
      },
      include: {
        manualReviews: {
          where: { policyId: policy.id },
          take: 1,
        },
        complianceChecks: {
          where: { policyId: policy.id },
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
    });

    // Map catalog settings with status
    const catalogSettingsResult = catalogSettings.map((setting) => {
      const actualValue = this.extractValueFromPath(policyData, setting.settingPath);
      const complianceCheck = setting.complianceChecks[0];
      const manualReview = setting.manualReviews[0];

      let status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'UNKNOWN' = 'NOT_CONFIGURED';
      if (actualValue !== undefined && actualValue !== null) {
        status = 'CONFIGURED';
      }

      return {
        id: setting.id,
        displayName: setting.displayName,
        settingPath: setting.settingPath,
        expectedValue: setting.expectedValue,
        description: setting.description,
        status,
        actualValue: actualValue !== undefined ? JSON.stringify(actualValue) : null,
        isCompliant: complianceCheck?.isCompliant ?? null,
        manualReview: manualReview ? this.mapToResponse(manualReview as any) : null,
      };
    });

    // Find uncatalogued settings (in policy but not in catalog)
    const catalogPaths = new Set(catalogSettings.map((s) => s.settingPath.toLowerCase()));
    const uncataloguedSettings = this.findUncataloguedSettings(policyData, catalogPaths);

    // Build summary
    const configuredCount = catalogSettingsResult.filter((s) => s.status === 'CONFIGURED').length;
    const reviewedCount = catalogSettingsResult.filter((s) => s.manualReview?.isReviewed).length;

    return {
      policy: {
        id: policy.id,
        policyName: policy.policyName,
        policyType: policy.policyType,
        odataType: policy.odataType,
        templateFamily: policy.templateFamily,
      },
      catalogSettings: catalogSettingsResult,
      uncataloguedSettings,
      summary: {
        totalCatalogSettings: catalogSettings.length,
        configuredCount,
        notConfiguredCount: catalogSettings.length - configuredCount,
        uncataloguedCount: uncataloguedSettings.length,
        reviewedCount,
      },
    };
  }

  /**
   * Get raw policy settings data
   */
  async getPolicyRawSettings(policyId: number): Promise<Record<string, any>> {
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: { policyData: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    try {
      return JSON.parse(policy.policyData);
    } catch {
      return {};
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapToResponse(review: any): ManualSettingReviewResponse {
    return {
      id: review.id,
      settingId: review.settingId,
      policyId: review.policyId,
      controlId: review.controlId,
      isReviewed: review.isReviewed,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      reviewedBy: review.reviewedBy,
      manualComplianceStatus: review.manualComplianceStatus,
      manualExpectedValue: review.manualExpectedValue,
      manualActualValue: review.manualActualValue,
      rationale: review.rationale,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      setting: review.setting,
      policy: review.policy,
    };
  }

  private extractValueFromPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;

      // Handle array notation like "items[0]"
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]];
        if (Array.isArray(current)) {
          current = current[parseInt(arrayMatch[2])];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  private findUncataloguedSettings(
    obj: any,
    catalogPaths: Set<string>,
    prefix = ''
  ): Array<{ path: string; value: any }> {
    const uncatalogued: Array<{ path: string; value: any }> = [];

    if (!obj || typeof obj !== 'object') return uncatalogued;

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      // Skip common metadata fields
      if (['@odata.type', '@odata.context', 'id', 'createdDateTime', 'lastModifiedDateTime'].includes(key)) {
        continue;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        uncatalogued.push(...this.findUncataloguedSettings(value, catalogPaths, path));
      } else if (!catalogPaths.has(path.toLowerCase())) {
        uncatalogued.push({ path, value });
      }
    }

    return uncatalogued;
  }
}

export const manualReviewService = new ManualReviewService();
export default manualReviewService;
```

---

## Phase 4: API Routes

### File: `server/src/routes/manualReview.routes.ts` (NEW FILE)

```typescript
// server/src/routes/manualReview.routes.ts

import { Router } from 'express';
import { manualReviewService } from '../services/manualReview.service';

const router = Router();

/**
 * POST /api/manual-reviews
 * Create or update a manual review
 */
router.post('/', async (req, res) => {
  try {
    const { settingId, policyId, controlId, isReviewed, manualComplianceStatus, manualExpectedValue, manualActualValue, rationale } = req.body;

    // Validate required fields
    if (!settingId) {
      return res.status(400).json({ success: false, error: 'settingId is required' });
    }

    if (!rationale || rationale.trim() === '') {
      return res.status(400).json({ success: false, error: 'rationale is required' });
    }

    const review = await manualReviewService.upsertReview({
      settingId,
      policyId: policyId || undefined,
      controlId: controlId || undefined,
      isReviewed: isReviewed ?? true,
      manualComplianceStatus: manualComplianceStatus || undefined,
      manualExpectedValue: manualExpectedValue || undefined,
      manualActualValue: manualActualValue || undefined,
      rationale: rationale.trim(),
    });

    res.json({ success: true, review });
  } catch (error) {
    console.error('Error creating manual review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/setting/:settingId
 * Get all reviews for a setting
 */
router.get('/setting/:settingId', async (req, res) => {
  try {
    const settingId = parseInt(req.params.settingId);
    const reviews = await manualReviewService.getReviewsForSetting(settingId);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews for setting:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/control/:controlId
 * Get all reviews for a control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const controlId = parseInt(req.params.controlId);
    const reviews = await manualReviewService.getReviewsForControl(controlId);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews for control:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/:settingId/:policyId
 * Get a specific review
 */
router.get('/:settingId/:policyId', async (req, res) => {
  try {
    const settingId = parseInt(req.params.settingId);
    const policyId = req.params.policyId === '0' ? undefined : parseInt(req.params.policyId);
    const review = await manualReviewService.getReview(settingId, policyId);
    res.json({ success: true, review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/manual-reviews/:id
 * Delete a manual review
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await manualReviewService.deleteReview(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/selector
 * Get policies for the policy selector sidebar
 */
router.get('/policies/selector', async (req, res) => {
  try {
    const { searchTerm, policyType, isActive } = req.query;

    const policies = await manualReviewService.getPoliciesForSelector({
      searchTerm: searchTerm as string | undefined,
      policyType: policyType as string | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, policies });
  } catch (error) {
    console.error('Error fetching policies for selector:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/:policyId/comparison
 * Get policy settings comparison (catalog vs actual)
 */
router.get('/policies/:policyId/comparison', async (req, res) => {
  try {
    const policyId = parseInt(req.params.policyId);
    const comparison = await manualReviewService.getPolicySettingsComparison(policyId);
    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Error fetching policy comparison:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/manual-reviews/policies/:policyId/raw-settings
 * Get raw policy settings JSON
 */
router.get('/policies/:policyId/raw-settings', async (req, res) => {
  try {
    const policyId = parseInt(req.params.policyId);
    const settings = await manualReviewService.getPolicyRawSettings(policyId);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching policy raw settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

### Update: `server/src/routes/index.ts`

Add the new routes to the main router:

```typescript
// Add import at top of file
import manualReviewRoutes from './manualReview.routes';

// Add route registration (after existing routes)
router.use('/manual-reviews', manualReviewRoutes);
```

---

## Phase 5: Frontend Service

### File: `client/src/services/manualReview.service.ts` (NEW FILE)

```typescript
// client/src/services/manualReview.service.ts

import {
  ManualSettingReview,
  ManualSettingReviewCreate,
  ManualSettingReviewUpdate,
  PolicyForSelector,
  PolicySettingsComparison,
} from '../types/manualReview.types';

const API_BASE = '/api/manual-reviews';

class ManualReviewService {
  /**
   * Create or update a manual review
   */
  async upsertReview(data: ManualSettingReviewCreate): Promise<ManualSettingReview> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save review');
    }

    const result = await response.json();
    return result.review;
  }

  /**
   * Get all reviews for a setting
   */
  async getReviewsForSetting(settingId: number): Promise<ManualSettingReview[]> {
    const response = await fetch(`${API_BASE}/setting/${settingId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const result = await response.json();
    return result.reviews;
  }

  /**
   * Get all reviews for a control
   */
  async getReviewsForControl(controlId: number): Promise<ManualSettingReview[]> {
    const response = await fetch(`${API_BASE}/control/${controlId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const result = await response.json();
    return result.reviews;
  }

  /**
   * Get a specific review
   */
  async getReview(settingId: number, policyId?: number): Promise<ManualSettingReview | null> {
    const response = await fetch(`${API_BASE}/${settingId}/${policyId || 0}`);
    if (!response.ok) throw new Error('Failed to fetch review');
    const result = await response.json();
    return result.review;
  }

  /**
   * Delete a review
   */
  async deleteReview(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete review');
  }

  /**
   * Get policies for selector
   */
  async getPoliciesForSelector(params?: {
    searchTerm?: string;
    policyType?: string;
    isActive?: boolean;
  }): Promise<PolicyForSelector[]> {
    const searchParams = new URLSearchParams();
    if (params?.searchTerm) searchParams.set('searchTerm', params.searchTerm);
    if (params?.policyType) searchParams.set('policyType', params.policyType);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const url = `${API_BASE}/policies/selector${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch policies');
    const result = await response.json();
    return result.policies;
  }

  /**
   * Get policy settings comparison
   */
  async getPolicySettingsComparison(policyId: number): Promise<PolicySettingsComparison> {
    const response = await fetch(`${API_BASE}/policies/${policyId}/comparison`);
    if (!response.ok) throw new Error('Failed to fetch comparison');
    const result = await response.json();
    return result.comparison;
  }

  /**
   * Get raw policy settings
   */
  async getPolicyRawSettings(policyId: number): Promise<Record<string, any>> {
    const response = await fetch(`${API_BASE}/policies/${policyId}/raw-settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    const result = await response.json();
    return result.settings;
  }
}

export const manualReviewService = new ManualReviewService();
export default manualReviewService;
```

---

## Phase 6: React Components

### File: `client/src/components/manual-review/PolicySelectorDrawer.tsx` (NEW FILE)

```typescript
// client/src/components/manual-review/PolicySelectorDrawer.tsx

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Policy as PolicyIcon,
  Cloud as IntuneIcon,
  Security as AzureADIcon,
  Shield as PurviewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { manualReviewService } from '../../services/manualReview.service';
import { PolicyForSelector } from '../../types/manualReview.types';

interface PolicySelectorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectPolicy: (policy: PolicyForSelector) => void;
  settingInfo?: {
    displayName: string;
    policyType: string;
  };
}

const getPolicyIcon = (type: string) => {
  switch (type) {
    case 'Intune':
      return <IntuneIcon />;
    case 'AzureAD':
      return <AzureADIcon />;
    case 'Purview':
      return <PurviewIcon />;
    default:
      return <PolicyIcon />;
  }
};

const getPolicyTypeColor = (type: string) => {
  switch (type) {
    case 'Intune':
      return 'info';
    case 'AzureAD':
      return 'success';
    case 'Purview':
      return 'secondary';
    default:
      return 'default';
  }
};

export const PolicySelectorDrawer: React.FC<PolicySelectorDrawerProps> = ({
  open,
  onClose,
  onSelectPolicy,
  settingInfo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [policyTypeFilter, setPolicyTypeFilter] = useState<string>('all');

  // Fetch policies
  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['policies-selector', searchTerm, policyTypeFilter],
    queryFn: () =>
      manualReviewService.getPoliciesForSelector({
        searchTerm: searchTerm || undefined,
        policyType: policyTypeFilter !== 'all' ? policyTypeFilter : undefined,
        isActive: true,
      }),
    enabled: open,
  });

  // Filter policies based on search
  const filteredPolicies = useMemo(() => {
    if (!policies) return [];
    return policies;
  }, [policies]);

  const handleSelectPolicy = (policy: PolicyForSelector) => {
    onSelectPolicy(policy);
    // Don't close - let parent handle transition to comparison view
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          bgcolor: '#1E1E1E',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Select Policy</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Setting Info */}
        {settingInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Associating Setting:
            </Typography>
            <Typography variant="body2">{settingInfo.displayName}</Typography>
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search policies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Policy Type Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Policy Type</InputLabel>
          <Select
            value={policyTypeFilter}
            label="Policy Type"
            onChange={(e) => setPolicyTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Intune">Intune</MenuItem>
            <MenuItem value="AzureAD">Azure AD</MenuItem>
            <MenuItem value="Purview">Purview</MenuItem>
          </Select>
        </FormControl>

        {/* Policy List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load policies</Alert>
        ) : filteredPolicies.length === 0 ? (
          <Alert severity="info">No policies found</Alert>
        ) : (
          <List sx={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
            {filteredPolicies.map((policy) => (
              <ListItemButton
                key={policy.id}
                onClick={() => handleSelectPolicy(policy)}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <ListItemIcon>{getPolicyIcon(policy.policyType)}</ListItemIcon>
                <ListItemText
                  primary={policy.policyName}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={policy.policyType}
                        size="small"
                        color={getPolicyTypeColor(policy.policyType) as any}
                      />
                      {policy.templateFamily && (
                        <Chip label={policy.templateFamily} size="small" variant="outlined" />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {/* Results count */}
        {!isLoading && !error && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'} found
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default PolicySelectorDrawer;
```

### File: `client/src/components/manual-review/PolicyComparisonModal.tsx` (NEW FILE)

```typescript
// client/src/components/manual-review/PolicyComparisonModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CompliantIcon,
  Cancel as NonCompliantIcon,
  HelpOutline as PartialIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { manualReviewService } from '../../services/manualReview.service';
import {
  PolicyForSelector,
  ManualComplianceStatus,
  CatalogSettingComparison,
} from '../../types/manualReview.types';

interface PolicyComparisonModalProps {
  open: boolean;
  onClose: () => void;
  policy: PolicyForSelector;
  settingToAssociate?: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
  };
  controlId?: number;
  onSuccess?: () => void;
}

const getStatusIcon = (status: ManualComplianceStatus | null) => {
  switch (status) {
    case 'COMPLIANT':
      return <CompliantIcon color="success" />;
    case 'NON_COMPLIANT':
      return <NonCompliantIcon color="error" />;
    case 'PARTIAL':
      return <PartialIcon color="warning" />;
    default:
      return null;
  }
};

export const PolicyComparisonModal: React.FC<PolicyComparisonModalProps> = ({
  open,
  onClose,
  policy,
  settingToAssociate,
  controlId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [manualExpectedValue, setManualExpectedValue] = useState('');
  const [manualComplianceStatus, setManualComplianceStatus] = useState<ManualComplianceStatus | ''>('');
  const [rationale, setRationale] = useState('');

  // Filter state for comparison view
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Initialize form with setting data
  useEffect(() => {
    if (settingToAssociate) {
      setManualExpectedValue(settingToAssociate.expectedValue);
    }
  }, [settingToAssociate]);

  // Fetch policy comparison data
  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['policy-comparison', policy.id],
    queryFn: () => manualReviewService.getPolicySettingsComparison(policy.id),
    enabled: open,
  });

  // Fetch raw policy settings
  const { data: rawSettings } = useQuery({
    queryKey: ['policy-raw-settings', policy.id],
    queryFn: () => manualReviewService.getPolicyRawSettings(policy.id),
    enabled: open,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!settingToAssociate) throw new Error('No setting to associate');
      if (!rationale.trim()) throw new Error('Rationale is required');

      return manualReviewService.upsertReview({
        settingId: settingToAssociate.id,
        policyId: policy.id,
        controlId: controlId,
        isReviewed: true,
        manualComplianceStatus: manualComplianceStatus || undefined,
        manualExpectedValue: manualExpectedValue !== settingToAssociate.expectedValue ? manualExpectedValue : undefined,
        rationale: rationale.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['manual-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['m365-settings'] });
      onSuccess?.();
      onClose();
    },
  });

  // Filter catalog settings
  const filteredCatalogSettings = React.useMemo(() => {
    if (!comparison) return [];
    return comparison.catalogSettings.filter((setting) => {
      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        if (
          !setting.displayName.toLowerCase().includes(search) &&
          !setting.settingPath.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all' && setting.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [comparison, searchFilter, statusFilter]);

  // Find actual value for the setting we're associating
  const actualValueForSetting = React.useMemo(() => {
    if (!rawSettings || !settingToAssociate) return null;
    const pathParts = settingToAssociate.settingPath.split('.');
    let value: any = rawSettings;
    for (const part of pathParts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    return value;
  }, [rawSettings, settingToAssociate]);

  const handleSave = () => {
    saveMutation.mutate();
  };

  const canSave = rationale.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { bgcolor: '#1E1E1E', minHeight: '80vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">{policy.policyName}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={policy.policyType} size="small" color="primary" />
              {policy.templateFamily && (
                <Chip label={policy.templateFamily} size="small" variant="outlined" />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {comparisonLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
            {/* Left Panel - Policy Settings Overview */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Policy Settings Comparison
              </Typography>

              {/* Summary */}
              {comparison && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Catalog Settings
                    </Typography>
                    <Typography variant="h6">{comparison.summary.totalCatalogSettings}</Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Configured
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {comparison.summary.configuredCount}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Not Configured
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {comparison.summary.notConfiguredCount}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#2C2C2C' }}>
                    <Typography variant="caption" color="text.secondary">
                      Reviewed
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {comparison.summary.reviewedCount}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Filters */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search settings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="CONFIGURED">Configured</MenuItem>
                    <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Settings List */}
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredCatalogSettings.map((setting) => (
                  <Accordion key={setting.id} sx={{ bgcolor: '#2C2C2C', mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Chip
                          label={setting.status === 'CONFIGURED' ? '✓' : '✗'}
                          size="small"
                          color={setting.status === 'CONFIGURED' ? 'success' : 'error'}
                          sx={{ minWidth: 32 }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {setting.displayName}
                        </Typography>
                        {setting.manualReview?.isReviewed && (
                          <Tooltip title="Manually Reviewed">
                            <Chip label="Reviewed" size="small" color="info" variant="outlined" />
                          </Tooltip>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Path: {setting.settingPath}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Expected: {setting.expectedValue}
                      </Typography>
                      {setting.actualValue && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Actual: {setting.actualValue}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>

            {/* Right Panel - Association Form (if setting provided) */}
            {settingToAssociate && (
              <Box sx={{ width: 400, flexShrink: 0 }}>
                <Paper sx={{ p: 2, bgcolor: '#2C2C2C' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Associate Setting with Policy
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {settingToAssociate.displayName}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Path: {settingToAssociate.settingPath}
                    </Typography>
                  </Alert>

                  {/* Actual Value from Policy */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Actual Value (from policy):
                    </Typography>
                    <Paper sx={{ p: 1, bgcolor: '#1a1a1a' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {actualValueForSetting !== null
                          ? JSON.stringify(actualValueForSetting, null, 2)
                          : 'Not found in policy'}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Expected Value (editable) */}
                  <TextField
                    fullWidth
                    label="Expected Value"
                    value={manualExpectedValue}
                    onChange={(e) => setManualExpectedValue(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    helperText="Optional - leave unchanged to use catalog default"
                  />

                  {/* Manual Compliance Status */}
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Compliance Status</InputLabel>
                    <Select
                      value={manualComplianceStatus}
                      label="Compliance Status"
                      onChange={(e) => setManualComplianceStatus(e.target.value as ManualComplianceStatus)}
                    >
                      <MenuItem value="">
                        <em>Auto-calculate</em>
                      </MenuItem>
                      <MenuItem value="COMPLIANT">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CompliantIcon color="success" fontSize="small" />
                          Compliant
                        </Box>
                      </MenuItem>
                      <MenuItem value="PARTIAL">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PartialIcon color="warning" fontSize="small" />
                          Partial
                        </Box>
                      </MenuItem>
                      <MenuItem value="NON_COMPLIANT">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NonCompliantIcon color="error" fontSize="small" />
                          Non-Compliant
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Rationale (required) */}
                  <TextField
                    fullWidth
                    label="Rationale *"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    multiline
                    rows={4}
                    size="small"
                    required
                    error={rationale.trim().length === 0}
                    helperText="Required - explain why this association/override is being made"
                    placeholder="e.g., Verified against CIS Benchmark v1.2 - this policy setting satisfies the encryption requirement..."
                  />
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        {settingToAssociate && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!canSave || saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Save & Mark as Reviewed
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PolicyComparisonModal;
```

### File: `client/src/components/manual-review/SettingAssociationButton.tsx` (NEW FILE)

```typescript
// client/src/components/manual-review/SettingAssociationButton.tsx

import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import PolicySelectorDrawer from './PolicySelectorDrawer';
import PolicyComparisonModal from './PolicyComparisonModal';
import { PolicyForSelector } from '../../types/manualReview.types';

interface SettingAssociationButtonProps {
  setting: {
    id: number;
    displayName: string;
    settingPath: string;
    expectedValue: string;
    description: string | null;
    policyType: string;
  };
  controlId?: number;
  onSuccess?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const SettingAssociationButton: React.FC<SettingAssociationButtonProps> = ({
  setting,
  controlId,
  onSuccess,
  variant = 'outlined',
  size = 'small',
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyForSelector | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const handleSelectPolicy = (policy: PolicyForSelector) => {
    setSelectedPolicy(policy);
    setDrawerOpen(false);
    setComparisonOpen(true);
  };

  const handleCloseComparison = () => {
    setComparisonOpen(false);
    setSelectedPolicy(null);
  };

  const handleSuccess = () => {
    handleCloseComparison();
    onSuccess?.();
  };

  return (
    <>
      <Tooltip title="Associate with Policy">
        <Button
          variant={variant}
          size={size}
          startIcon={<LinkIcon />}
          onClick={() => setDrawerOpen(true)}
        >
          Associate
        </Button>
      </Tooltip>

      <PolicySelectorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectPolicy={handleSelectPolicy}
        settingInfo={{
          displayName: setting.displayName,
          policyType: setting.policyType,
        }}
      />

      {selectedPolicy && (
        <PolicyComparisonModal
          open={comparisonOpen}
          onClose={handleCloseComparison}
          policy={selectedPolicy}
          settingToAssociate={setting}
          controlId={controlId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default SettingAssociationButton;
```

### File: `client/src/components/manual-review/ReviewedBadge.tsx` (NEW FILE)

```typescript
// client/src/components/manual-review/ReviewedBadge.tsx

import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import {
  CheckCircle as CompliantIcon,
  Cancel as NonCompliantIcon,
  HelpOutline as PartialIcon,
  Verified as ReviewedIcon,
} from '@mui/icons-material';
import { ManualComplianceStatus } from '../../types/manualReview.types';

interface ReviewedBadgeProps {
  isReviewed: boolean;
  manualComplianceStatus?: ManualComplianceStatus | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rationale?: string;
  size?: 'small' | 'medium';
}

const getStatusColor = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'NON_COMPLIANT':
      return 'error';
    default:
      return 'info';
  }
};

const getStatusIcon = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return <CompliantIcon fontSize="small" />;
    case 'PARTIAL':
      return <PartialIcon fontSize="small" />;
    case 'NON_COMPLIANT':
      return <NonCompliantIcon fontSize="small" />;
    default:
      return <ReviewedIcon fontSize="small" />;
  }
};

const getStatusLabel = (status: ManualComplianceStatus | null | undefined) => {
  switch (status) {
    case 'COMPLIANT':
      return 'Compliant (Manual)';
    case 'PARTIAL':
      return 'Partial (Manual)';
    case 'NON_COMPLIANT':
      return 'Non-Compliant (Manual)';
    default:
      return 'Reviewed';
  }
};

export const ReviewedBadge: React.FC<ReviewedBadgeProps> = ({
  isReviewed,
  manualComplianceStatus,
  reviewedAt,
  reviewedBy,
  rationale,
  size = 'small',
}) => {
  if (!isReviewed) return null;

  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="body2" fontWeight="bold" gutterBottom>
        Manually Reviewed
      </Typography>
      {reviewedAt && (
        <Typography variant="caption" display="block">
          Reviewed: {new Date(reviewedAt).toLocaleDateString()}
        </Typography>
      )}
      {reviewedBy && (
        <Typography variant="caption" display="block">
          By: {reviewedBy}
        </Typography>
      )}
      {rationale && (
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          <strong>Rationale:</strong> {rationale}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        icon={getStatusIcon(manualComplianceStatus)}
        label={getStatusLabel(manualComplianceStatus)}
        size={size}
        color={getStatusColor(manualComplianceStatus) as any}
        variant="outlined"
        sx={{
          borderWidth: 2,
          '& .MuiChip-icon': {
            color: 'inherit',
          },
        }}
      />
    </Tooltip>
  );
};

export default ReviewedBadge;
```

### File: `client/src/components/manual-review/PolicyCompareButton.tsx` (NEW FILE)

```typescript
// client/src/components/manual-review/PolicyCompareButton.tsx

import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Compare as CompareIcon } from '@mui/icons-material';
import PolicyComparisonModal from './PolicyComparisonModal';
import { PolicyForSelector } from '../../types/manualReview.types';

interface PolicyCompareButtonProps {
  policy: PolicyForSelector;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const PolicyCompareButton: React.FC<PolicyCompareButtonProps> = ({
  policy,
  variant = 'outlined',
  size = 'small',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Compare settings against catalog">
        <Button
          variant={variant}
          size={size}
          startIcon={<CompareIcon />}
          onClick={() => setOpen(true)}
        >
          Compare
        </Button>
      </Tooltip>

      <PolicyComparisonModal
        open={open}
        onClose={() => setOpen(false)}
        policy={policy}
        // No settingToAssociate - just viewing comparison
      />
    </>
  );
};

export default PolicyCompareButton;
```

### File: `client/src/components/manual-review/index.ts` (NEW FILE)

```typescript
// client/src/components/manual-review/index.ts

export { PolicySelectorDrawer } from './PolicySelectorDrawer';
export { PolicyComparisonModal } from './PolicyComparisonModal';
export { SettingAssociationButton } from './SettingAssociationButton';
export { ReviewedBadge } from './ReviewedBadge';
export { PolicyCompareButton } from './PolicyCompareButton';
```

---

## Phase 7: Integration Points

### 7.1 Update `SettingsToControlsTab.tsx`

Add the association button and reviewed badge to the SettingCard and SettingRow components.

**File:** `client/src/components/policy-viewer/SettingsToControlsTab.tsx`

**FIND** (in the SettingCard component, near the bottom of the card):
```typescript
{/* Mapped Controls */}
<Box>
  <Typography variant="subtitle2" sx={{ color: '#B0B0B0', mb: 1 }}>
    Mapped Controls:
  </Typography>
```

**ADD BEFORE:**
```typescript
{/* Manual Review Actions */}
<Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
  <SettingAssociationButton
    setting={{
      id: setting.id,
      displayName: setting.settingName,
      settingPath: setting.settingPath,
      expectedValue: setting.expectedValue,
      description: setting.settingDescription,
      policyType: setting.policyType,
    }}
    onSuccess={() => {
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['all-settings-to-controls'] });
    }}
  />
  {setting.manualReview?.isReviewed && (
    <ReviewedBadge
      isReviewed={setting.manualReview.isReviewed}
      manualComplianceStatus={setting.manualReview.manualComplianceStatus}
      reviewedAt={setting.manualReview.reviewedAt}
      rationale={setting.manualReview.rationale}
    />
  )}
</Box>
```

**ADD IMPORTS at top of file:**
```typescript
import { SettingAssociationButton, ReviewedBadge } from '../manual-review';
```

### 7.2 Update `AllSettingsView.tsx`

Similar integration for the AllSettingsView component.

**File:** `client/src/components/policy-viewer/AllSettingsView.tsx`

Follow the same pattern as SettingsToControlsTab.tsx - add the SettingAssociationButton and ReviewedBadge to each setting card/row.

### 7.3 Update `M365SettingsTab.tsx`

**File:** `client/src/components/M365Settings/M365SettingsTab.tsx`

**ADD** the association button to each setting row in the control's M365 settings tab.

**FIND** the row/card that displays each setting and add:
```typescript
<SettingAssociationButton
  setting={{
    id: detail.settingId,
    displayName: detail.displayName,
    settingPath: detail.settingPath,
    expectedValue: detail.expectedValue,
    description: detail.description,
    policyType: detail.policyType,
  }}
  controlId={controlDbId} // Pass the control's database ID
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['m365-settings', controlId] });
  }}
/>
```

### 7.4 Update Policy Cards (IntunePolicyCard, PurviewPolicyCard, AzureADPolicyCard)

Add the Compare button to each policy card.

**File:** `client/src/components/policy-viewer/IntunePolicyCard.tsx`

**FIND** the CardActions or action buttons section:

**ADD:**
```typescript
import { PolicyCompareButton } from '../manual-review';

// In the card's action area:
<PolicyCompareButton
  policy={{
    id: policy.id,
    policyName: policy.policyName,
    policyType: policy.policyType,
    policyDescription: policy.policyDescription,
    odataType: policy.parsedData?.odataType || null,
    templateFamily: policy.parsedData?.templateFamily || null,
    isActive: policy.isActive,
    lastSynced: policy.lastSynced,
  }}
/>
```

Repeat for `PurviewPolicyCard.tsx` and `AzureADPolicyCard.tsx`.

### 7.5 Update PolicyDetailModal

**File:** `client/src/components/policy-viewer/PolicyDetailModal.tsx`

Add the Compare button in the modal header or actions area.

---

## Phase 8: Update Types for Manual Review Data

### Update `PolicySettingToControl` interface

**File:** `client/src/types/policyViewer.types.ts`

**FIND:**
```typescript
export interface PolicySettingToControl {
```

**ADD** to the interface:
```typescript
  // Manual review data
  manualReview?: {
    id: number;
    isReviewed: boolean;
    reviewedAt: string | null;
    manualComplianceStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | null;
    manualExpectedValue: string | null;
    rationale: string;
  } | null;
```

---

## Phase 9: Backend - Include Manual Reviews in Existing Queries

### Update `m365.routes.ts` - All Settings Query

**File:** `server/src/routes/m365.routes.ts`

When fetching settings-to-controls, include manual review data:

**FIND** the query that fetches settings and **UPDATE** to include:
```typescript
include: {
  // ... existing includes
  manualReviews: {
    take: 1,
    orderBy: { updatedAt: 'desc' },
  },
}
```

Then map the result to include the manual review:
```typescript
manualReview: setting.manualReviews[0] ? {
  id: setting.manualReviews[0].id,
  isReviewed: setting.manualReviews[0].isReviewed,
  reviewedAt: setting.manualReviews[0].reviewedAt?.toISOString() || null,
  manualComplianceStatus: setting.manualReviews[0].manualComplianceStatus,
  manualExpectedValue: setting.manualReviews[0].manualExpectedValue,
  rationale: setting.manualReviews[0].rationale,
} : null,
```

---

## Phase 10: Compliance Calculation Override

### Update compliance calculation logic

When calculating compliance status, check for manual overrides first.

**File:** `server/src/services/settingsMapper.service.ts` (or wherever compliance is calculated)

**FIND** where compliance status is determined and **UPDATE:**
```typescript
// Check for manual override first
const manualReview = await prisma.manualSettingReview.findFirst({
  where: {
    settingId: setting.id,
    policyId: policy.id,
    isReviewed: true,
    manualComplianceStatus: { not: null },
  },
});

if (manualReview?.manualComplianceStatus) {
  // Use manual override
  return {
    isCompliant: manualReview.manualComplianceStatus === 'COMPLIANT',
    status: manualReview.manualComplianceStatus,
    isManualOverride: true,
  };
}

// Otherwise, calculate automatically
// ... existing calculation logic
```

---

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] ManualSettingReview table created
- [ ] Relations work correctly

### API Endpoints
- [ ] POST /api/manual-reviews - Creates/updates review
- [ ] GET /api/manual-reviews/setting/:id - Gets reviews for setting
- [ ] GET /api/manual-reviews/policies/selector - Returns policy list
- [ ] GET /api/manual-reviews/policies/:id/comparison - Returns comparison data
- [ ] DELETE /api/manual-reviews/:id - Deletes review

### Frontend Components
- [ ] PolicySelectorDrawer opens and shows policies
- [ ] Clicking policy opens PolicyComparisonModal immediately
- [ ] Comparison shows catalog vs actual settings
- [ ] Association form validates rationale is required
- [ ] Expected value is optional
- [ ] Save creates review with isReviewed=true
- [ ] ReviewedBadge appears after saving
- [ ] Compare button on policy cards opens comparison
- [ ] SettingAssociationButton works in M365SettingsTab

### Compliance Override
- [ ] Manual compliance status overrides auto-calculation
- [ ] Dashboard/reports reflect manual status

---

## File Summary

### New Files to Create

**Server:**
1. `server/src/types/manualReview.types.ts`
2. `server/src/services/manualReview.service.ts`
3. `server/src/routes/manualReview.routes.ts`

**Client:**
1. `client/src/types/manualReview.types.ts`
2. `client/src/services/manualReview.service.ts`
3. `client/src/components/manual-review/PolicySelectorDrawer.tsx`
4. `client/src/components/manual-review/PolicyComparisonModal.tsx`
5. `client/src/components/manual-review/SettingAssociationButton.tsx`
6. `client/src/components/manual-review/ReviewedBadge.tsx`
7. `client/src/components/manual-review/PolicyCompareButton.tsx`
8. `client/src/components/manual-review/index.ts`

### Files to Modify

1. `server/prisma/schema.prisma` - Add ManualSettingReview model
2. `server/src/routes/index.ts` - Register new routes
3. `client/src/components/policy-viewer/SettingsToControlsTab.tsx` - Add buttons
4. `client/src/components/policy-viewer/AllSettingsView.tsx` - Add buttons
5. `client/src/components/M365Settings/M365SettingsTab.tsx` - Add buttons
6. `client/src/components/policy-viewer/IntunePolicyCard.tsx` - Add Compare button
7. `client/src/components/policy-viewer/PurviewPolicyCard.tsx` - Add Compare button
8. `client/src/components/policy-viewer/AzureADPolicyCard.tsx` - Add Compare button
9. `client/src/components/policy-viewer/PolicyDetailModal.tsx` - Add Compare button
10. `client/src/types/policyViewer.types.ts` - Add manualReview to types
11. `server/src/routes/m365.routes.ts` - Include manual reviews in queries
