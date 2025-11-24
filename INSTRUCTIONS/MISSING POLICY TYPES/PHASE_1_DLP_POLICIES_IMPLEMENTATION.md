# Phase 1: DLP Policies Implementation

## Overview

**Goal:** Add Microsoft Purview Data Loss Prevention (DLP) policy syncing to the NIST 800-171 compliance application

**Impact:** 
- Adds 95 settings with compliance checks (from 297 to 392 settings with checks)
- Improves coverage from 44% to 58%
- Targets controls in the SC (System and Communications Protection) family

**Priority:** HIGH - DLP policies are critical for data protection compliance

---

## Prerequisites

### Required Permissions

Ensure your Azure AD app registration (`AZURE_CLIENT_ID`) has these permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `InformationProtectionPolicy.Read.All` | Application | Read DLP policies |
| `SecurityEvents.Read.All` | Application | Alternative permission for security policies |

**To Grant Permissions:**
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. Select your application
3. Click "API permissions" → "Add a permission"
4. Select "Microsoft Graph" → "Application permissions"
5. Search for and add `InformationProtectionPolicy.Read.All`
6. Click "Grant admin consent" (requires Global Admin)

### Environment Validation

Before starting, verify your environment:

```bash
# Check that required environment variables are set
echo "Tenant ID: ${AZURE_TENANT_ID:?Error: AZURE_TENANT_ID not set}"
echo "Client ID: ${AZURE_CLIENT_ID:?Error: AZURE_CLIENT_ID not set}"
echo "Client Secret: ${AZURE_CLIENT_SECRET:+Set (hidden)}"

# Test authentication
cd server
npx tsx src/scripts/test-auth.ts
```

Expected output:
```
✅ Token acquired
✅ Graph API accessible
✅ Organization data retrieved
```

---

## Implementation Steps

### Step 1: Update Purview Service

**File:** `server/src/services/purview.service.ts`

**Objective:** Replace the placeholder `getDLPPolicies()` method with functional Graph API integration

#### 1.1 Replace getDLPPolicies() Method

🔍 **FIND:**
```typescript
  /**
   * Fetch DLP policies (Note: Limited Graph API support, may need PowerShell)
   */
  async getDLPPolicies(): Promise<any[]> {
    try {
      console.log('Fetching DLP policies...');

      // Note: DLP policies have limited Graph API support
      // This is a placeholder - actual implementation may require
      // Security & Compliance PowerShell or different API endpoint

      console.log('⚠️  DLP policies require Security & Compliance Center API');
      console.log('   Current Graph API has limited DLP support');

      return [];
    } catch (error) {
      console.error('Error fetching DLP policies:', error);
      return [];
    }
  }
```

✏️ **REPLACE WITH:**
```typescript
  /**
   * Fetch DLP policies from Microsoft Graph API (Beta)
   * 
   * Note: Uses beta endpoint - requires InformationProtectionPolicy.Read.All permission
   */
  async getDLPPolicies(): Promise<any[]> {
    try {
      console.log('Fetching DLP policies (beta API)...');

      const response = await graphClientService.getBeta<{ value: any[] }>(
        '/security/informationProtection/dataLossPreventionPolicies'
      );

      console.log(`✅ Found ${response.value.length} DLP policies`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch DLP policies:', error.message);
      console.log('   This endpoint requires beta API and InformationProtectionPolicy.Read.All permission');
      console.log('   If you see 403/404 errors, verify permissions in Azure AD app registration');
      
      // Return empty array instead of throwing - DLP may not be configured
      return [];
    }
  }
```

**Why this works:**
- Uses `graphClientService.getBeta()` for beta endpoint access
- Properly handles errors without crashing the sync
- Returns empty array if DLP not configured or permissions missing
- Provides helpful error messages for troubleshooting

#### 1.2 Update getInformationProtectionSummary() Method

🔍 **FIND:**
```typescript
  /**
   * Get information protection summary
   */
  async getInformationProtectionSummary(): Promise<{
    sensitivityLabelsCount: number;
    isConfigured: boolean;
    labels: PurviewSensitivityLabel[];
  }> {
    const labels = await this.getSensitivityLabels();

    return {
      sensitivityLabelsCount: labels.length,
      isConfigured: labels.length > 0,
      labels,
    };
  }
```

✏️ **REPLACE WITH:**
```typescript
  /**
   * Get information protection summary including DLP policies
   */
  async getInformationProtectionSummary(): Promise<{
    sensitivityLabelsCount: number;
    isConfigured: boolean;
    labels: PurviewSensitivityLabel[];
    dlpPolicies: any[];
  }> {
    // Fetch labels and DLP policies in parallel
    const [labels, dlpPolicies] = await Promise.all([
      this.getSensitivityLabels(),
      this.getDLPPolicies()
    ]);

    return {
      sensitivityLabelsCount: labels.length,
      isConfigured: labels.length > 0 || dlpPolicies.length > 0,
      labels,
      dlpPolicies,
    };
  }
```

**Why this works:**
- Fetches both labels and DLP policies in parallel (faster)
- Returns DLP policies in the summary
- Updates `isConfigured` to check for either labels OR DLP policies
- Maintains backward compatibility (labels field still present)

---

### Step 2: Update Policy Sync Service

**File:** `server/src/services/policySync.service.ts`

**Objective:** Add DLP policy syncing to the database

#### 2.1 Add DLP Policy Sync Logic

🔍 **FIND:**
```typescript
  /**
   * Sync Purview policies to database
   */
  private async syncPurviewPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    for (const label of data.labels) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: label.id },
      });

      const result = await prisma.m365Policy.upsert({
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

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    return count;
  }
```

✏️ **REPLACE WITH:**
```typescript
  /**
   * Sync Purview policies to database (Labels + DLP)
   */
  private async syncPurviewPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    // Sync Sensitivity Labels
    for (const label of data.labels || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: label.id },
      });

      const result = await prisma.m365Policy.upsert({
        where: { policyId: label.id },
        update: {
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
          odataType: '#microsoft.graph.sensitivityLabel',
          templateFamily: 'Purview',
          lastSynced: new Date(),
          isActive: label.isActive !== false,
        },
        create: {
          policyType: 'Purview',
          policyId: label.id,
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
          odataType: '#microsoft.graph.sensitivityLabel',
          templateFamily: 'Purview',
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync DLP Policies (NEW)
    for (const policy of data.dlpPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || `Mode: ${policy.mode || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType: '#microsoft.graph.dataLossPreventionPolicy',
          templateFamily: 'Purview',
          lastSynced: new Date(),
          isActive: policy.mode !== 'TestWithoutNotifications' && policy.mode !== 'Disabled',
        },
        create: {
          policyType: 'Purview',
          policyId: policy.id,
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || `Mode: ${policy.mode || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType: '#microsoft.graph.dataLossPreventionPolicy',
          templateFamily: 'Purview',
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    console.log(`✓ Synced ${count} Purview policies (Labels + DLP)`);
    return count;
  }
```

**Key Changes:**
1. Added `|| []` safety checks for both labels and dlpPolicies
2. Added `odataType` and `templateFamily` to label sync (matches DLP pattern)
3. New DLP policy sync loop with proper field mapping
4. DLP policies use `mode` field to determine if active
5. Proper console logging for visibility

---

### Step 3: Verify TypeScript Types

**File:** `server/src/types/m365.types.ts`

**Objective:** Ensure type definitions support DLP data

Check if the Purview summary type needs updating:

🔍 **FIND (or verify exists):**
```typescript
export interface PurviewInformationProtection {
  sensitivityLabelsCount: number;
  isConfigured: boolean;
  labels: PurviewSensitivityLabel[];
  dlpPolicies?: any[]; // This should exist or be added
}
```

**If the `dlpPolicies` field is missing**, add it:

```typescript
export interface PurviewInformationProtection {
  sensitivityLabelsCount: number;
  isConfigured: boolean;
  labels: PurviewSensitivityLabel[];
  dlpPolicies: any[]; // ADD THIS LINE
}
```

---

## Testing Procedures

### Test 1: Unit Test - Purview Service

**Purpose:** Verify DLP API calls work

```bash
cd server

# Create test script
cat > src/scripts/test-dlp.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { purviewService } from '../services/purview.service';

async function testDLP() {
  console.log('🧪 Testing DLP Policy Retrieval\n');

  try {
    // Test DLP API
    console.log('1️⃣ Fetching DLP policies...');
    const dlpPolicies = await purviewService.getDLPPolicies();
    console.log(`   Result: Found ${dlpPolicies.length} DLP policies`);

    if (dlpPolicies.length > 0) {
      console.log('\n   Sample DLP Policy:');
      const sample = dlpPolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.name || sample.displayName}`);
      console.log(`   - Mode: ${sample.mode}`);
      console.log(`   - Description: ${sample.description || 'N/A'}`);
    } else {
      console.log('   ⚠️  No DLP policies found (or permissions missing)');
    }

    // Test full summary
    console.log('\n2️⃣ Fetching Information Protection Summary...');
    const summary = await purviewService.getInformationProtectionSummary();
    console.log(`   Sensitivity Labels: ${summary.sensitivityLabelsCount}`);
    console.log(`   DLP Policies: ${summary.dlpPolicies.length}`);
    console.log(`   Is Configured: ${summary.isConfigured}`);

    console.log('\n✅ DLP test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ DLP test failed:', error);
    process.exit(1);
  }
}

testDLP();
EOF

# Run test
npx tsx src/scripts/test-dlp.ts
```

**Expected Output:**
```
🧪 Testing DLP Policy Retrieval

1️⃣ Fetching DLP policies...
Fetching DLP policies (beta API)...
✅ Found 2 DLP policies
   Result: Found 2 DLP policies

   Sample DLP Policy:
   - ID: 00000000-0000-0000-0000-000000000000
   - Name: Protect Financial Data
   - Mode: Enable
   - Description: Prevents sharing of credit card numbers

2️⃣ Fetching Information Protection Summary...
   Sensitivity Labels: 3
   DLP Policies: 2
   Is Configured: true

✅ DLP test completed successfully!
```

**Troubleshooting:**
- **403 Forbidden**: App registration missing `InformationProtectionPolicy.Read.All` permission
- **404 Not Found**: DLP endpoint not available (check if using beta API)
- **0 policies returned**: DLP may not be configured in your tenant (this is OK)

---

### Test 2: Integration Test - Full Sync

**Purpose:** Verify DLP policies sync to database

```bash
cd server

# Run policy sync
npx tsx src/scripts/test-sync.ts
```

**Expected Output:**
```
🔄 Starting M365 policy sync...
Fetching DLP policies (beta API)...
✅ Found 2 DLP policies
✓ Synced 5 Purview policies (Labels + DLP)
✓ Policy sync completed

📊 Sync Result:
  Success: true
  Policies Updated: 23
  Duration: 2847ms

📈 Integration Stats:
  Total Policies: 23
  Active Policies: 23
  Breakdown:
    Intune: 18
    Purview: 5  <-- Should increase from 3 to 5 if you have 2 DLP policies
    Azure AD: 0
```

**Verify in Database:**
```bash
# Check DLP policies in database
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const dlpPolicies = await prisma.m365Policy.findMany({
    where: { 
      policyType: 'Purview',
      odataType: '#microsoft.graph.dataLossPreventionPolicy'
    }
  });
  
  console.log(\`\nDLP Policies in Database: \${dlpPolicies.length}\`);
  dlpPolicies.forEach(p => {
    console.log(\`  - \${p.policyName} (Active: \${p.isActive})\`);
  });
  
  await prisma.\$disconnect();
}

check();
"
```

**Expected Output:**
```
DLP Policies in Database: 2
  - Protect Financial Data (Active: true)
  - GDPR Compliance (Active: true)
```

---

### Test 3: Compliance Validation

**Purpose:** Verify DLP settings are matched to controls

```bash
cd server

# Check unmatched settings BEFORE implementation
npx tsx src/scripts/check-unmatched-settings.ts > before_dlp.txt

# Run compliance revalidation
npx tsx src/scripts/revalidate-all.ts

# Check unmatched settings AFTER implementation
npx tsx src/scripts/check-unmatched-settings.ts > after_dlp.txt

# Compare results
echo "Settings with checks BEFORE DLP:"
grep "Settings with compliance checks:" before_dlp.txt

echo "Settings with checks AFTER DLP:"
grep "Settings with compliance checks:" after_dlp.txt
```

**Expected Improvement:**
```
Settings with checks BEFORE DLP:
  Settings with compliance checks: 297 (44%)

Settings with checks AFTER DLP:
  Settings with compliance checks: 392 (58%)  <-- +95 settings
```

---

### Test 4: API Endpoint Test

**Purpose:** Verify Purview API returns DLP data

Test via your application's API:

```bash
# Start your backend server (if not running)
cd server
npm run dev

# In another terminal:
curl http://localhost:5000/api/m365/purview/summary | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "sensitivityLabelsCount": 3,
    "isConfigured": true,
    "labels": [...],
    "dlpPolicies": [
      {
        "id": "00000000-0000-0000-0000-000000000000",
        "name": "Protect Financial Data",
        "mode": "Enable",
        "description": "Prevents sharing of credit card numbers"
      },
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "GDPR Compliance",
        "mode": "Enable",
        "description": "Protects EU personal data"
      }
    ]
  }
}
```

---

## Verification Checklist

Before marking Phase 1 complete, verify:

- [ ] **Code Changes Applied**
  - [ ] `purview.service.ts` updated with functional `getDLPPolicies()`
  - [ ] `purview.service.ts` summary includes `dlpPolicies` field
  - [ ] `policySync.service.ts` syncs DLP policies with correct odataType
  - [ ] TypeScript types updated (if needed)

- [ ] **API Permissions Configured**
  - [ ] `InformationProtectionPolicy.Read.All` added to app registration
  - [ ] Admin consent granted
  - [ ] Test auth script passes

- [ ] **Testing Completed**
  - [ ] Unit test shows DLP policies retrieved from API
  - [ ] Integration test shows DLP policies in database
  - [ ] Database contains DLP policies with correct `odataType`
  - [ ] Settings with compliance checks increased by ~95

- [ ] **No Regressions**
  - [ ] Existing Purview label sync still works
  - [ ] Intune policies still sync correctly
  - [ ] No TypeScript compilation errors
  - [ ] Backend starts without errors

---

## Rollback Procedure

If issues occur, rollback changes:

```bash
cd server/src/services

# Restore purview.service.ts
git checkout purview.service.ts

# Restore policySync.service.ts
git checkout policySync.service.ts

# Remove test script
rm src/scripts/test-dlp.ts

# Restart server
npm run dev
```

---

## Common Issues & Solutions

### Issue 1: 403 Forbidden Error

**Symptom:**
```
⚠️  Could not fetch DLP policies: Forbidden
```

**Solution:**
1. Verify app registration has `InformationProtectionPolicy.Read.All` permission
2. Ensure admin consent was granted (check Azure Portal)
3. Wait 5-10 minutes after granting consent for permissions to propagate
4. Try refreshing token cache:
   ```bash
   curl -X POST http://localhost:5000/api/auth/refresh-token
   ```

### Issue 2: 404 Not Found Error

**Symptom:**
```
⚠️  Could not fetch DLP policies: Not Found
```

**Solution:**
1. Verify using beta API endpoint (not v1.0)
2. Check that `graphClientService.getBeta()` is being called
3. DLP API may not be available in your tenant tier (requires E5 or specific license)

### Issue 3: Empty Results but No Errors

**Symptom:**
```
✅ Found 0 DLP policies
```

**Possible Causes:**
1. **No DLP configured**: This is NORMAL if you haven't created DLP policies yet
2. **Licensing**: DLP requires specific Microsoft 365 licenses
3. **Permissions**: May have read permission but no policies exist

**Validation:**
- Check Microsoft Purview portal to see if DLP policies exist
- Verify your org has appropriate licensing for DLP

### Issue 4: TypeScript Compilation Errors

**Symptom:**
```
Error: Property 'dlpPolicies' does not exist on type...
```

**Solution:**
Update TypeScript interface in `server/src/types/m365.types.ts`:
```typescript
export interface PurviewInformationProtection {
  sensitivityLabelsCount: number;
  isConfigured: boolean;
  labels: PurviewSensitivityLabel[];
  dlpPolicies: any[]; // Add this
}
```

### Issue 5: Database Constraint Violation

**Symptom:**
```
Unique constraint failed on fields: (`policyId`)
```

**Solution:**
DLP policy IDs may conflict with existing policies. Check:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const dupes = await prisma.m365Policy.groupBy({
  by: ['policyId'],
  _count: { id: true },
  having: { id: { _count: { gt: 1 } } }
});
console.log('Duplicate policy IDs:', dupes);
await prisma.\$disconnect();
"
```

---

## Success Metrics

After Phase 1 completion:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Settings with checks | 297 (44%) | 392+ (58%+) | +95 |
| Purview policies synced | 3 | 5+ | +2+ |
| Policy types synced | 21 | 22 | +1 |
| Unmatched settings | 375 | 280 | -95 |

---

## Next Steps

After completing Phase 1:

1. **Proceed to Phase 2**: PIM Policies (95 settings)
2. **Monitor DLP sync**: Check sync logs regularly
3. **Validate compliance**: Run gap analysis reports
4. **Document DLP policies**: Update organization documentation

---

## Additional Resources

### Microsoft Documentation
- [DLP Policies Overview](https://learn.microsoft.com/en-us/microsoft-365/compliance/dlp-learn-about-dlp)
- [Graph API - DLP Beta Endpoint](https://learn.microsoft.com/en-us/graph/api/resources/informationprotectionpolicy?view=graph-rest-beta)
- [Required Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference#informationprotectionpolicyreadall)

### Project Files
- Purview Service: `server/src/services/purview.service.ts`
- Policy Sync Service: `server/src/services/policySync.service.ts`
- Graph Client: `server/src/services/graphClient.service.ts`
- Types: `server/src/types/m365.types.ts`

### Validation Scripts
- Auth Test: `server/src/scripts/test-auth.ts`
- Sync Test: `server/src/scripts/test-sync.ts`
- DLP Test: `server/src/scripts/test-dlp.ts` (created in this phase)
- Unmatched Settings: `server/src/scripts/check-unmatched-settings.ts`

---

## Phase Completion Sign-off

**Implementation Date:** ___________  
**Implemented By:** ___________  
**Verified By:** ___________

**Results:**
- [ ] All tests passing
- [ ] DLP policies syncing successfully
- [ ] No regressions detected
- [ ] Documentation updated

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

**End of Phase 1 Implementation Guide**
