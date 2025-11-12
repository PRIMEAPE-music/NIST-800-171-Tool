# Phase 1: Backend API Enhancements

## Overview
Build backend API endpoints and services to support the Policy Viewer page. This includes detailed policy retrieval, parsing services, and enhanced data formatting.

## Prerequisites
- Existing M365 integration working
- Prisma client configured
- m365.routes.ts file exists

---

## Step 1: Create Policy Viewer Types

📁 **File:** `server/src/types/policyViewer.types.ts`

```typescript
// Policy Viewer Specific Types

export interface PolicyDetail {
  id: number;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyId: string;
  policyName: string;
  policyDescription: string | null;
  lastSynced: Date;
  isActive: boolean;
  parsedData: ParsedPolicyData;
  mappedControls: MappedControl[];
}

export interface ParsedPolicyData {
  // Common fields
  displayName: string;
  description?: string;
  createdDateTime?: string;
  modifiedDateTime?: string;
  
  // Type-specific fields will be in 'settings' object
  settings: Record<string, any>;
  
  // Metadata
  odataType?: string;
  platformType?: string;
}

export interface MappedControl {
  controlId: string;
  controlTitle: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
}

export interface PolicySearchParams {
  policyType?: 'Intune' | 'Purview' | 'AzureAD';
  searchTerm?: string;
  isActive?: boolean;
  controlId?: string;
  sortBy?: 'name' | 'lastSynced' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface PolicyViewerStats {
  totalPolicies: number;
  activePolicies: number;
  inactivePolicies: number;
  byType: {
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
  lastSyncDate: Date | null;
  policiesWithMappings: number;
}

export interface PolicyExportData {
  exportDate: Date;
  policies: PolicyDetail[];
  stats: PolicyViewerStats;
}
```

---

## Step 2: Create Policy Viewer Service

📁 **File:** `server/src/services/policyViewer.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import {
  PolicyDetail,
  PolicySearchParams,
  PolicyViewerStats,
  ParsedPolicyData,
  MappedControl,
} from '../types/policyViewer.types';

const prisma = new PrismaClient();

class PolicyViewerService {
  /**
   * Get all policies with optional filtering and search
   */
  async getPolicies(params: PolicySearchParams): Promise<PolicyDetail[]> {
    const {
      policyType,
      searchTerm,
      isActive,
      controlId,
      sortBy = 'lastSynced',
      sortOrder = 'desc',
    } = params;

    // Build where clause
    const where: any = {};

    if (policyType) {
      where.policyType = policyType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (searchTerm) {
      where.OR = [
        { policyName: { contains: searchTerm, mode: 'insensitive' } },
        { policyDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // If filtering by control, join through mappings
    if (controlId) {
      where.controlPolicyMappings = {
        some: {
          control: {
            controlId: controlId,
          },
        },
      };
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.policyName = sortOrder;
    } else if (sortBy === 'lastSynced') {
      orderBy.lastSynced = sortOrder;
    } else if (sortBy === 'type') {
      orderBy.policyType = sortOrder;
    }

    // Fetch policies with related data
    const policies = await prisma.m365Policy.findMany({
      where,
      orderBy,
      include: {
        controlPolicyMappings: {
          include: {
            control: {
              select: {
                controlId: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Transform to PolicyDetail format
    return policies.map((policy) => this.transformToPolicyDetail(policy));
  }

  /**
   * Get a single policy by ID with full details
   */
  async getPolicyById(id: number): Promise<PolicyDetail | null> {
    const policy = await prisma.m365Policy.findUnique({
      where: { id },
      include: {
        controlPolicyMappings: {
          include: {
            control: {
              select: {
                controlId: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return null;
    }

    return this.transformToPolicyDetail(policy);
  }

  /**
   * Get policy viewer statistics
   */
  async getStats(): Promise<PolicyViewerStats> {
    const [total, active, byType, lastSync, withMappings] = await Promise.all([
      prisma.m365Policy.count(),
      prisma.m365Policy.count({ where: { isActive: true } }),
      prisma.m365Policy.groupBy({
        by: ['policyType'],
        _count: true,
      }),
      prisma.m365Policy.findFirst({
        orderBy: { lastSynced: 'desc' },
        select: { lastSynced: true },
      }),
      prisma.m365Policy.count({
        where: {
          controlPolicyMappings: {
            some: {},
          },
        },
      }),
    ]);

    const byTypeMap = {
      Intune: 0,
      Purview: 0,
      AzureAD: 0,
    };

    byType.forEach((item) => {
      byTypeMap[item.policyType as keyof typeof byTypeMap] = item._count;
    });

    return {
      totalPolicies: total,
      activePolicies: active,
      inactivePolicies: total - active,
      byType: byTypeMap,
      lastSyncDate: lastSync?.lastSynced || null,
      policiesWithMappings: withMappings,
    };
  }

  /**
   * Transform database policy to PolicyDetail format
   */
  private transformToPolicyDetail(policy: any): PolicyDetail {
    // Parse the policyData JSON string
    let parsedData: ParsedPolicyData;
    try {
      const rawData = JSON.parse(policy.policyData);
      parsedData = this.parsePolicyData(rawData, policy.policyType);
    } catch (error) {
      console.error(`Failed to parse policy data for ${policy.policyId}:`, error);
      parsedData = {
        displayName: policy.policyName,
        settings: {},
      };
    }

    // Transform mapped controls
    const mappedControls: MappedControl[] =
      policy.controlPolicyMappings?.map((mapping: any) => ({
        controlId: mapping.control.controlId,
        controlTitle: mapping.control.title,
        mappingConfidence: mapping.mappingConfidence,
        mappingNotes: mapping.mappingNotes,
      })) || [];

    return {
      id: policy.id,
      policyType: policy.policyType,
      policyId: policy.policyId,
      policyName: policy.policyName,
      policyDescription: policy.policyDescription,
      lastSynced: policy.lastSynced,
      isActive: policy.isActive,
      parsedData,
      mappedControls,
    };
  }

  /**
   * Parse raw policy data based on type
   */
  private parsePolicyData(rawData: any, policyType: string): ParsedPolicyData {
    const parsed: ParsedPolicyData = {
      displayName: rawData.displayName || rawData.Name || 'Unknown',
      description: rawData.description || rawData.Comment,
      createdDateTime: rawData.createdDateTime || rawData.CreatedTime,
      modifiedDateTime: rawData.lastModifiedDateTime || rawData.LastModifiedTime,
      settings: {},
    };

    switch (policyType) {
      case 'Intune':
        return this.parseIntunePolicy(rawData, parsed);
      case 'Purview':
        return this.parsePurviewPolicy(rawData, parsed);
      case 'AzureAD':
        return this.parseAzureADPolicy(rawData, parsed);
      default:
        return parsed;
    }
  }

  /**
   * Parse Intune policy data
   */
  private parseIntunePolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    parsed.odataType = rawData['@odata.type'];
    parsed.platformType = rawData.platformType;

    // Extract relevant settings based on policy type
    const settings: Record<string, any> = {};

    // Common Intune fields
    if (rawData.passwordRequired !== undefined)
      settings.passwordRequired = rawData.passwordRequired;
    if (rawData.passwordMinimumLength)
      settings.passwordMinimumLength = rawData.passwordMinimumLength;
    if (rawData.requireHealthyDeviceReport !== undefined)
      settings.requireHealthyDeviceReport = rawData.requireHealthyDeviceReport;
    if (rawData.osMinimumVersion)
      settings.osMinimumVersion = rawData.osMinimumVersion;
    if (rawData.osMaximumVersion)
      settings.osMaximumVersion = rawData.osMaximumVersion;

    // BitLocker settings
    if (rawData.bitLockerEnabled !== undefined)
      settings.bitLockerEnabled = rawData.bitLockerEnabled;

    // Firewall settings
    if (rawData.firewallEnabled !== undefined)
      settings.firewallEnabled = rawData.firewallEnabled;

    // Device encryption
    if (rawData.storageRequireEncryption !== undefined)
      settings.storageRequireEncryption = rawData.storageRequireEncryption;

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Parse Purview policy data
   */
  private parsePurviewPolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    const settings: Record<string, any> = {};

    // DLP Policy specific
    if (rawData.Enabled !== undefined) settings.enabled = rawData.Enabled;
    if (rawData.Mode) settings.mode = rawData.Mode;
    if (rawData.Priority !== undefined) settings.priority = rawData.Priority;

    // Sensitivity Label specific
    if (rawData.sensitivity !== undefined) settings.sensitivity = rawData.sensitivity;
    if (rawData.isActive !== undefined) settings.isActive = rawData.isActive;
    if (rawData.parentId) settings.parentId = rawData.parentId;

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Parse Azure AD policy data
   */
  private parseAzureADPolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    const settings: Record<string, any> = {};

    // Conditional Access specific
    if (rawData.state) settings.state = rawData.state;
    if (rawData.conditions) settings.conditions = rawData.conditions;
    if (rawData.grantControls) settings.grantControls = rawData.grantControls;
    if (rawData.sessionControls) settings.sessionControls = rawData.sessionControls;

    // MFA specific
    if (rawData.includeApplications)
      settings.includeApplications = rawData.includeApplications;
    if (rawData.excludeApplications)
      settings.excludeApplications = rawData.excludeApplications;

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Get policies mapped to a specific control
   */
  async getPoliciesByControl(controlId: string): Promise<PolicyDetail[]> {
    return this.getPolicies({ controlId });
  }

  /**
   * Get export data for all policies
   */
  async getExportData(): Promise<any> {
    const [policies, stats] = await Promise.all([
      this.getPolicies({}),
      this.getStats(),
    ]);

    return {
      exportDate: new Date(),
      policies,
      stats,
    };
  }
}

export default new PolicyViewerService();
```

---

## Step 3: Enhance M365 Routes

📁 **File:** `server/src/routes/m365.routes.ts`

🔍 **FIND:**
```typescript
export default router;
```

✏️ **REPLACE WITH:**
```typescript
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

export default router;
```

➕ **ADD AFTER:** the imports section at the top
```typescript
import policyViewerService from '../services/policyViewer.service';
import { PolicySearchParams } from '../types/policyViewer.types';
```

---

## Step 4: Update Server Index

📁 **File:** `server/src/index.ts`

Verify that m365 routes are registered. Should already have:
```typescript
app.use('/api/m365', m365Routes);
```

---

## Step 5: Test Backend Endpoints

📁 **File:** `server/tests/policyViewer.http`

```http
### Get all policies for viewer
GET http://localhost:3001/api/m365/policies/viewer

### Get Intune policies only
GET http://localhost:3001/api/m365/policies/viewer?policyType=Intune

### Search policies
GET http://localhost:3001/api/m365/policies/viewer?searchTerm=compliance

### Get active policies only
GET http://localhost:3001/api/m365/policies/viewer?isActive=true

### Get policies mapped to specific control
GET http://localhost:3001/api/m365/policies/viewer?controlId=3.5.3

### Get single policy detail (replace :id with actual ID)
GET http://localhost:3001/api/m365/policies/viewer/1

### Get viewer stats
GET http://localhost:3001/api/m365/policies/viewer/stats

### Export policy data
GET http://localhost:3001/api/m365/policies/viewer/export
```

---

## Verification Checklist

- [ ] `policyViewer.types.ts` created with all type definitions
- [ ] `policyViewer.service.ts` created with complete service class
- [ ] New routes added to `m365.routes.ts`
- [ ] Import statements added correctly
- [ ] Server compiles without TypeScript errors
- [ ] Test endpoints in `policyViewer.http` work
- [ ] Viewer endpoints return formatted policy data
- [ ] Search and filter parameters work correctly
- [ ] Stats endpoint returns accurate counts
- [ ] Export endpoint returns complete data

---

## Common Issues & Solutions

**Issue:** TypeScript errors about missing types
- **Solution:** Ensure all imports are correct and types file is in correct location

**Issue:** Policies returned but parsedData is empty
- **Solution:** Check that policyData JSON in database is valid, add error handling

**Issue:** Mapped controls not showing
- **Solution:** Verify controlPolicyMappings table has data, check Prisma include syntax

**Issue:** Search not working
- **Solution:** Verify SQLite supports case-insensitive search, may need to adjust mode

---

## Next Steps

Proceed to **Phase 2** (`02_FRONTEND_COMPONENTS.md`) to build the frontend page and components.
