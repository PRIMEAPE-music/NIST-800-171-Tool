# Phase 6 Part 4: Policy Mapping & Sync Logic

## 🎯 Objective
Map Microsoft 365 policies to NIST 800-171 Rev3 controls, store them in the database, and implement sync logic to keep data current.

## 📋 Prerequisites
- Part 1 completed (database with m365_policies, control_policy_mappings tables)
- Part 2 completed (authentication working)
- Part 3 completed (M365 services fetching data)
- `/api/m365/dashboard` returns policy data

## 🗂️ Files to Create/Modify

### 1. Policy Mapping Templates (Data File)

**📁 File**: `data/control-m365-mappings.json`

🔄 **COMPLETE FILE**:

```json
{
  "mappings": [
    {
      "controlId": "3.1.1",
      "controlTitle": "Limit system access to authorized users",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "policyTypeMatch": "ConditionalAccess",
        "keywords": ["access", "authentication", "authorized"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Conditional Access policies directly control who can access systems"
    },
    {
      "controlId": "3.1.2",
      "controlTitle": "Limit system access to types of transactions and functions",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "policyTypeMatch": "ConditionalAccess",
        "keywords": ["role", "application", "permissions"]
      },
      "mappingConfidence": "Medium",
      "mappingReason": "Conditional Access can limit access to specific applications"
    },
    {
      "controlId": "3.1.3",
      "controlTitle": "Control the flow of CUI",
      "policyTypes": ["Purview"],
      "searchCriteria": {
        "keywords": ["dlp", "data loss prevention", "information protection"]
      },
      "mappingConfidence": "High",
      "mappingReason": "DLP policies control data flow and prevent unauthorized sharing"
    },
    {
      "controlId": "3.1.5",
      "controlTitle": "Employ principle of least privilege",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "policyTypeMatch": "ConditionalAccess",
        "keywords": ["least privilege", "role", "permissions"]
      },
      "mappingConfidence": "Medium",
      "mappingReason": "Conditional Access can enforce least privilege access patterns"
    },
    {
      "controlId": "3.5.1",
      "controlTitle": "Identify system users",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "keywords": ["authentication", "identity"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Azure AD provides user identification and authentication"
    },
    {
      "controlId": "3.5.2",
      "controlTitle": "Authenticate users",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "keywords": ["authentication", "sign-in"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Azure AD handles all user authentication"
    },
    {
      "controlId": "3.5.3",
      "controlTitle": "Use multifactor authentication",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "policyTypeMatch": "ConditionalAccess",
        "keywords": ["mfa", "multifactor", "multi-factor"],
        "requiresMFA": true
      },
      "mappingConfidence": "High",
      "mappingReason": "Conditional Access policies can enforce MFA requirements"
    },
    {
      "controlId": "3.5.10",
      "controlTitle": "Store and transmit only encrypted passwords",
      "policyTypes": ["AzureAD"],
      "searchCriteria": {
        "keywords": ["password", "encryption", "hash"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Azure AD automatically encrypts and hashes all passwords"
    },
    {
      "controlId": "3.13.1",
      "controlTitle": "Monitor control and protect communications at system boundaries",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["defender", "firewall", "boundary", "network"]
      },
      "mappingConfidence": "Medium",
      "mappingReason": "Intune can enforce firewall and Defender for Endpoint policies"
    },
    {
      "controlId": "3.13.8",
      "controlTitle": "Implement cryptographic mechanisms to prevent unauthorized disclosure",
      "policyTypes": ["Purview", "Intune"],
      "searchCriteria": {
        "keywords": ["encryption", "sensitive", "label"]
      },
      "mappingConfidence": "Medium",
      "mappingReason": "Sensitivity labels and encryption policies protect data"
    },
    {
      "controlId": "3.13.11",
      "controlTitle": "Employ cryptographic mechanisms to protect CUI at rest",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["bitlocker", "encryption", "at rest"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Intune policies can enforce BitLocker encryption"
    },
    {
      "controlId": "3.13.16",
      "controlTitle": "Protect mobile code",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["mobile", "application", "app protection"]
      },
      "mappingConfidence": "Medium",
      "mappingReason": "Intune app protection policies secure mobile applications"
    },
    {
      "controlId": "3.14.1",
      "controlTitle": "Identify and document known vulnerabilities",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["compliance", "vulnerability", "assessment"]
      },
      "mappingConfidence": "Low",
      "mappingReason": "Intune compliance reports can help identify device vulnerabilities"
    },
    {
      "controlId": "3.14.2",
      "controlTitle": "Take corrective action on identified vulnerabilities",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["remediation", "compliance", "update"]
      },
      "mappingConfidence": "Low",
      "mappingReason": "Intune can enforce remediation through compliance policies"
    },
    {
      "controlId": "3.14.4",
      "controlTitle": "Update malicious code protection mechanisms",
      "policyTypes": ["Intune"],
      "searchCriteria": {
        "keywords": ["antivirus", "defender", "malware", "protection"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Intune policies enforce Defender antivirus and updates"
    }
  ]
}
```

### 2. Policy Sync Service

**📁 File**: `server/src/services/policySync.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { PrismaClient } from '@prisma/client';
import { intuneService } from './intune.service';
import { purviewService } from './purview.service';
import { azureADService } from './azureAD.service';
import { PolicyType, SyncResult } from '../types/m365.types';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

class PolicySyncService {
  private mappingTemplates: any[] = [];

  constructor() {
    this.loadMappingTemplates();
  }

  /**
   * Load predefined control-to-policy mapping templates
   */
  private loadMappingTemplates(): void {
    try {
      const mappingFile = path.join(__dirname, '../../../data/control-m365-mappings.json');
      const data = fs.readFileSync(mappingFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.mappingTemplates = parsed.mappings || [];
      console.log(`✅ Loaded ${this.mappingTemplates.length} mapping templates`);
    } catch (error) {
      console.error('Error loading mapping templates:', error);
      this.mappingTemplates = [];
    }
  }

  /**
   * Sync all M365 policies to database
   */
  async syncAllPolicies(forceRefresh: boolean = false): Promise<SyncResult> {
    const startTime = Date.now();
    let policiesUpdated = 0;
    let controlsUpdated = 0;
    const errors: string[] = [];

    console.log('🔄 Starting M365 policy sync...');

    try {
      // Fetch policies from each service
      const [intuneData, purviewData, azureADData] = await Promise.all([
        intuneService.getAllPolicies().catch(err => {
          errors.push(`Intune: ${err.message}`);
          return null;
        }),
        purviewService.getInformationProtectionSummary().catch(err => {
          errors.push(`Purview: ${err.message}`);
          return null;
        }),
        azureADService.getSecuritySummary().catch(err => {
          errors.push(`Azure AD: ${err.message}`);
          return null;
        }),
      ]);

      // Sync Intune policies
      if (intuneData) {
        const intuneCount = await this.syncIntunePolicies(intuneData);
        policiesUpdated += intuneCount;
      }

      // Sync Purview policies
      if (purviewData) {
        const purviewCount = await this.syncPurviewPolicies(purviewData);
        policiesUpdated += purviewCount;
      }

      // Sync Azure AD policies
      if (azureADData) {
        const azureADCount = await this.syncAzureADPolicies(azureADData);
        policiesUpdated += azureADCount;
      }

      // Auto-map policies to controls
      controlsUpdated = await this.autoMapPolicies();

      // Update sync settings
      await prisma.m365Settings.upsert({
        where: { id: 1 },
        update: {
          lastSyncDate: new Date(),
        },
        create: {
          id: 1,
          lastSyncDate: new Date(),
          syncEnabled: true,
        },
      });

      // Log sync result
      const duration = Date.now() - startTime;
      await prisma.m365SyncLog.create({
        data: {
          syncType: forceRefresh ? 'Manual' : 'Automatic',
          policiesUpdated,
          controlsUpdated,
          status: errors.length > 0 ? 'Partial' : 'Success',
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          syncDuration: duration,
        },
      });

      console.log(`✅ Sync complete: ${policiesUpdated} policies, ${controlsUpdated} controls updated`);

      return {
        success: errors.length === 0,
        policiesUpdated,
        controlsUpdated,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.m365SyncLog.create({
        data: {
          syncType: forceRefresh ? 'Manual' : 'Automatic',
          policiesUpdated: 0,
          controlsUpdated: 0,
          status: 'Failed',
          errorMessage,
          syncDuration: duration,
        },
      });

      throw error;
    }
  }

  /**
   * Sync Intune policies to database
   */
  private async syncIntunePolicies(data: any): Promise<number> {
    let count = 0;

    // Sync compliance policies
    for (const policy of data.compliancePolicies) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    // Sync configuration policies
    for (const policy of data.configurationPolicies) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync Purview policies to database
   */
  private async syncPurviewPolicies(data: any): Promise<number> {
    let count = 0;

    for (const label of data.labels) {
      await prisma.m365Policy.upsert({
        where: { policyId: label.id },
        update: {
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
          lastSynced: new Date(),
          isActive: label.isActive !== false,
        },
        create: {
          policyType: 'Purview',
          policyId: label.id,
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync Azure AD policies to database
   */
  private async syncAzureADPolicies(data: any): Promise<number> {
    let count = 0;

    for (const policy of data.conditionalAccessPolicies) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: policy.state === 'enabled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Automatically map policies to controls based on templates
   */
  private async autoMapPolicies(): Promise<number> {
    let count = 0;

    for (const template of this.mappingTemplates) {
      // Find control by controlId (e.g., "3.1.1")
      const control = await prisma.control.findFirst({
        where: { controlId: template.controlId },
      });

      if (!control) {
        console.warn(`Control ${template.controlId} not found in database`);
        continue;
      }

      // Find matching policies based on criteria
      const policies = await prisma.m365Policy.findMany({
        where: {
          policyType: {
            in: template.policyTypes,
          },
          isActive: true,
          OR: template.searchCriteria.keywords.map((keyword: string) => ({
            policyName: {
              contains: keyword,
              mode: 'insensitive' as any,
            },
          })),
        },
      });

      // Create mappings
      for (const policy of policies) {
        const existing = await prisma.controlPolicyMapping.findFirst({
          where: {
            controlId: control.id,
            policyId: policy.id,
          },
        });

        if (!existing) {
          await prisma.controlPolicyMapping.create({
            data: {
              controlId: control.id,
              policyId: policy.id,
              mappingConfidence: template.mappingConfidence,
              mappingNotes: template.mappingReason,
            },
          });
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Get sync status and history
   */
  async getSyncStatus(): Promise<{
    lastSyncDate?: Date;
    syncEnabled: boolean;
    recentLogs: any[];
  }> {
    const settings = await prisma.m365Settings.findFirst({
      where: { id: 1 },
    });

    const recentLogs = await prisma.m365SyncLog.findMany({
      take: 10,
      orderBy: { syncDate: 'desc' },
    });

    return {
      lastSyncDate: settings?.lastSyncDate || undefined,
      syncEnabled: settings?.syncEnabled || false,
      recentLogs,
    };
  }

  /**
   * Get all policy mappings for a specific control
   */
  async getPolicyMappingsForControl(controlId: number): Promise<any[]> {
    return prisma.controlPolicyMapping.findMany({
      where: { controlId },
      include: {
        policy: true,
      },
    });
  }

  /**
   * Get statistics about M365 integration
   */
  async getIntegrationStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    mappedControls: number;
    policyBreakdown: Record<PolicyType, number>;
  }> {
    const [totalPolicies, activePolicies, policyBreakdown, mappedControls] = await Promise.all([
      prisma.m365Policy.count(),
      prisma.m365Policy.count({ where: { isActive: true } }),
      prisma.m365Policy.groupBy({
        by: ['policyType'],
        _count: true,
      }),
      prisma.controlPolicyMapping.findMany({
        distinct: ['controlId'],
      }),
    ]);

    const breakdown: Record<string, number> = {
      Intune: 0,
      Purview: 0,
      AzureAD: 0,
    };

    for (const item of policyBreakdown) {
      breakdown[item.policyType] = item._count;
    }

    return {
      totalPolicies,
      activePolicies,
      mappedControls: mappedControls.length,
      policyBreakdown: breakdown as Record<PolicyType, number>,
    };
  }
}

export const policySyncService = new PolicySyncService();
```

### 3. Add Sync Routes

**📁 File**: `server/src/routes/m365.routes.ts`

🔍 **FIND** (at the end of the file, before `export default router`):
```typescript
export default router;
```

✏️ **ADD BEFORE**:
```typescript
import { policySyncService } from '../services/policySync.service';

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
```

### 4. Add Prisma Import to Routes

**📁 File**: `server/src/routes/m365.routes.ts`

🔍 **FIND** (at the top of file):
```typescript
import { Router } from 'express';
import { intuneService } from '../services/intune.service';
```

✏️ **ADD AFTER** imports:
```typescript
import { PrismaClient } from '@prisma/client';
import { PolicyType } from '../types/m365.types';

const prisma = new PrismaClient();
```

## 🧪 Testing

### 1. Test Sync Script

**📁 File**: `server/src/scripts/test-sync.ts`

🔄 **COMPLETE FILE**:

```typescript
import { policySyncService } from '../services/policySync.service';

async function testSync() {
  console.log('🔄 Testing Policy Sync...\n');

  try {
    // Trigger sync
    console.log('Starting sync...');
    const result = await policySyncService.syncAllPolicies(true);
    
    console.log('\n📊 Sync Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Policies Updated: ${result.policiesUpdated}`);
    console.log(`  Controls Updated: ${result.controlsUpdated}`);
    console.log(`  Duration: ${result.duration}ms`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }

    // Get stats
    console.log('\n📈 Integration Stats:');
    const stats = await policySyncService.getIntegrationStats();
    console.log(`  Total Policies: ${stats.totalPolicies}`);
    console.log(`  Active Policies: ${stats.activePolicies}`);
    console.log(`  Mapped Controls: ${stats.mappedControls}`);
    console.log('  Breakdown:');
    console.log(`    Intune: ${stats.policyBreakdown.Intune}`);
    console.log(`    Purview: ${stats.policyBreakdown.Purview}`);
    console.log(`    Azure AD: ${stats.policyBreakdown.AzureAD}`);

    console.log('\n🎉 Sync test completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync test failed:', error);
    process.exit(1);
  }
}

testSync();
```

### 2. Update package.json

**📁 File**: `server/package.json`

🔍 **FIND**:
```json
"test:m365": "ts-node src/scripts/test-m365-services.ts"
```

✏️ **ADD AFTER**:
```json
"test:sync": "ts-node src/scripts/test-sync.ts"
```

### 3. Create Test HTTP Requests

**📁 File**: `server/tests/sync.http`

🔄 **COMPLETE FILE**:

```http
### Trigger Manual Sync
POST http://localhost:3001/api/m365/sync
Content-Type: application/json

{
  "forceRefresh": true
}

### Get Sync Status
GET http://localhost:3001/api/m365/sync/status

### Get Integration Stats
GET http://localhost:3001/api/m365/stats

### Get All Policies
GET http://localhost:3001/api/m365/policies

### Get Intune Policies Only
GET http://localhost:3001/api/m365/policies?policyType=Intune

### Get Purview Policies Only
GET http://localhost:3001/api/m365/policies?policyType=Purview

### Get Azure AD Policies Only
GET http://localhost:3001/api/m365/policies?policyType=AzureAD

### Get Mappings for Control 3.5.3 (MFA)
# Note: Replace :controlId with actual database ID
GET http://localhost:3001/api/m365/control/1/mappings
```

### 4. Run Tests

```bash
# Test sync
npm run test:sync

# Or via API
curl -X POST http://localhost:3001/api/m365/sync \
  -H "Content-Type: application/json" \
  -d '{"forceRefresh": true}'

# Check stats
curl http://localhost:3001/api/m365/stats | jq
```

## ✅ Completion Checklist

- [ ] control-m365-mappings.json created with mapping templates
- [ ] policySync.service.ts created
- [ ] Sync routes added to m365.routes.ts
- [ ] Test sync script created
- [ ] Manual sync endpoint works (`POST /api/m365/sync`)
- [ ] Sync status endpoint works (`GET /api/m365/sync/status`)
- [ ] Stats endpoint returns policy counts
- [ ] Policies are stored in m365_policies table
- [ ] Control mappings created in control_policy_mappings table
- [ ] Sync logs created in m365_sync_logs table
- [ ] Can retrieve policies by type
- [ ] Can retrieve mappings for specific control

## 🔍 Verification

### Check Database After Sync

```sql
-- Check synced policies
SELECT policyType, COUNT(*) as count 
FROM m365_policies 
GROUP BY policyType;

-- Check control mappings
SELECT c.controlId, c.title, COUNT(cpm.id) as mapped_policies
FROM controls c
LEFT JOIN control_policy_mappings cpm ON c.id = cpm.controlId
GROUP BY c.id, c.controlId, c.title
HAVING COUNT(cpm.id) > 0;

-- Check sync logs
SELECT * FROM m365_sync_logs ORDER BY syncDate DESC LIMIT 5;
```

## 📝 Important Notes

### Mapping Confidence Levels
- **High**: Direct relationship (e.g., MFA policy → 3.5.3)
- **Medium**: Indirect or partial coverage
- **Low**: Tangential relationship or helper control

### Customizing Mappings
To add more mappings, edit `control-m365-mappings.json`:
1. Find control ID from NIST 800-171 Rev3
2. Determine which M365 service(s) apply
3. Define search criteria (keywords, policy types)
4. Set appropriate confidence level
5. Restart server to reload mappings

### Auto-Mapping Logic
The system matches policies to controls by:
1. Policy type (Intune/Purview/AzureAD)
2. Keywords in policy name
3. Special flags (e.g., `requiresMFA`)

Mappings are suggestions - admins can modify them in the UI (Part 6).

## 🚀 Next Steps

After completing Part 4, proceed to:
**Part 5: Frontend MSAL & Auth Flow** (`PHASE_6_PART_5_FRONTEND_AUTH.md`)

This will implement user authentication on the frontend using MSAL React.

---

**Estimated Time**: 3-4 hours
**Complexity**: High
**Dependencies**: Parts 1, 2, 3
