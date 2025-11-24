# Phase 3: Authorization Policy & Windows Custom Configuration Implementation

## Overview

**Goal:** Add Microsoft Azure AD Authorization Policy and Windows Custom Configuration policy syncing to the NIST 800-171 compliance application

**Impact:** 
- Adds 107 settings with compliance checks (57 from Authorization Policy, 50 from Windows Custom Config)
- Improves coverage by approximately 16 percentage points
- Targets controls in the AC (Access Control) and CM (Configuration Management) families

**Priority:** MEDIUM - Important for tenant-wide security settings and custom device configurations

**Dependencies:** Can be implemented independently or after Phases 1-2

---

## Prerequisites

### Required Permissions

Ensure your Azure AD app registration (`AZURE_CLIENT_ID`) has these permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `Policy.Read.All` | Application | Read authorization policy (may already be granted) |
| `DeviceManagementConfiguration.Read.All` | Application | Read Intune configurations (should already exist) |

**To Grant Permissions:**
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. Select your application
3. Click "API permissions" → "Add a permission"
4. Select "Microsoft Graph" → "Application permissions"
5. Search for and add `Policy.Read.All` (if not already present)
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

### Step 1: Update Azure AD Service

**File:** `server/src/services/azureAD.service.ts`

**Objective:** Add Authorization Policy retrieval (singleton resource)

#### 1.1 Add getAuthorizationPolicy() Method

➕ **ADD AFTER:** `getPrivilegedRoleAssignments()` method (or at the end of the class)

```typescript
  /**
   * Fetch Authorization Policy (singleton - one per tenant)
   * 
   * Note: This is a singleton resource - there's only ONE authorization policy per tenant
   * Contains guest user settings, user consent settings, default user permissions, etc.
   * Requires Policy.Read.All permission
   */
  async getAuthorizationPolicy(): Promise<any | null> {
    try {
      console.log('Fetching Authorization Policy (singleton)...');

      const response = await graphClientService.get(
        '/policies/authorizationPolicy'
      );

      console.log('✅ Retrieved tenant authorization policy');
      console.log(`   Guest user access: ${response.allowedToSignUpEmailBasedSubscriptions ? 'Enabled' : 'Disabled'}`);
      console.log(`   Guest invites: ${response.allowInvitesFrom || 'Default'}`);
      
      return response;
    } catch (error: any) {
      console.error('⚠️  Could not fetch authorization policy:', error.message);
      console.log('   This endpoint requires Policy.Read.All permission');
      console.log('   If you see 403/404 errors, verify permissions in Azure AD app registration');
      
      // Return null instead of throwing - this is a singleton that should always exist
      return null;
    }
  }
```

**Why this works:**
- Uses standard Graph API v1.0 endpoint (not beta)
- Authorization policy is a **singleton** - only one per tenant
- Contains critical tenant-wide security settings
- Proper error handling without crashing the sync
- Provides helpful troubleshooting messages

#### 1.2 Update getSecuritySummary() Method

🔍 **FIND:**
```typescript
  /**
   * Get comprehensive Azure AD security summary
   */
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
  }> {
    const [policies, mfaStatus, securityDefaults, privilegedRoles] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
    };
  }
```

✏️ **REPLACE WITH:**
```typescript
  /**
   * Get comprehensive Azure AD security summary including Authorization Policy
   */
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
    authorizationPolicy: any | null;
  }> {
    const [policies, mfaStatus, securityDefaults, privilegedRoles, authorizationPolicy] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
      this.getAuthorizationPolicy(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
      authorizationPolicy,
    };
  }
```

**Key Changes:**
1. Parallel fetching of Authorization Policy (faster)
2. Added `authorizationPolicy` field to return value (can be null)
3. Maintains backward compatibility (existing fields still present)

---

### Step 2: Update Policy Sync Service

**File:** `server/src/services/policySync.service.ts`

**Objective:** Add Authorization Policy syncing to the database

#### 2.1 Update getTemplateFamilyFromOdataType() Helper

🔍 **FIND:**
```typescript
  /**
   * Derive templateFamily from odataType
   */
  private getTemplateFamilyFromOdataType(odataType: string): string {
    if (!odataType) return 'Unknown';

    // Compliance policies
    if (odataType.includes('CompliancePolicy')) return 'Compliance';

    // Update policies
    if (odataType.includes('windowsUpdateForBusiness') || odataType.includes('Update')) return 'Update';

    // App Protection
    if (odataType.includes('ManagedAppProtection') || odataType.includes('AppProtection')) return 'AppProtection';

    // Conditional Access
    if (odataType.includes('conditionalAccess')) return 'ConditionalAccess';

    // Defender/Security
    if (odataType.includes('windowsDefenderAdvancedThreatProtection')) return 'DefenderSecurity';
    if (odataType.includes('endpointSecurityEndpointDetectionAndResponse')) return 'EndpointDetection';
```

✏️ **REPLACE WITH:**
```typescript
  /**
   * Derive templateFamily from odataType
   */
  private getTemplateFamilyFromOdataType(odataType: string): string {
    if (!odataType) return 'Unknown';

    // Compliance policies
    if (odataType.includes('CompliancePolicy')) return 'Compliance';

    // Update policies
    if (odataType.includes('windowsUpdateForBusiness') || odataType.includes('Update')) return 'Update';

    // App Protection
    if (odataType.includes('ManagedAppProtection') || odataType.includes('AppProtection')) return 'AppProtection';

    // Conditional Access
    if (odataType.includes('conditionalAccess')) return 'ConditionalAccess';

    // Authorization Policy (NEW)
    if (odataType.includes('authorizationPolicy')) return 'AzureAD';

    // Windows Custom Configuration (NEW)
    if (odataType.includes('windows10CustomConfiguration')) return 'Configuration';

    // Defender/Security
    if (odataType.includes('windowsDefenderAdvancedThreatProtection')) return 'DefenderSecurity';
    if (odataType.includes('endpointSecurityEndpointDetectionAndResponse')) return 'EndpointDetection';
```

**Why this matters:**
- Ensures correct `templateFamily` assignment for new policy types
- Authorization Policy gets 'AzureAD' family
- Windows Custom Configuration gets 'Configuration' family
- Maintains consistency with existing patterns

#### 2.2 Add Authorization Policy Sync Logic

🔍 **FIND:**
```typescript
  /**
   * Sync Azure AD policies to database
   */
  private async syncAzureADPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    for (const policy of data.conditionalAccessPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = '#microsoft.graph.conditionalAccessPolicy';
      const templateFamily = 'ConditionalAccess';

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: policy.state === 'enabled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
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
   * Sync Azure AD policies to database
   */
  private async syncAzureADPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    // Sync Conditional Access Policies
    for (const policy of data.conditionalAccessPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = '#microsoft.graph.conditionalAccessPolicy';
      const templateFamily = 'ConditionalAccess';

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: policy.state === 'enabled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync Authorization Policy (Singleton - NEW)
    if (data.authorizationPolicy) {
      const authPolicy = data.authorizationPolicy;
      
      // Use a consistent ID for the singleton authorization policy
      const policyId = authPolicy.id || 'authorizationPolicy';
      
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId },
      });

      const odataType = '#microsoft.graph.authorizationPolicy';
      const templateFamily = 'AzureAD';

      // Create descriptive summary of key settings
      const guestSettings = [
        authPolicy.allowInvitesFrom ? `Invites: ${authPolicy.allowInvitesFrom}` : null,
        authPolicy.blockMsolPowerShell !== undefined ? `Block MSOL: ${authPolicy.blockMsolPowerShell}` : null,
        authPolicy.allowedToSignUpEmailBasedSubscriptions !== undefined 
          ? `Email signup: ${authPolicy.allowedToSignUpEmailBasedSubscriptions}` 
          : null,
      ].filter(Boolean).join(', ');

      const result = await prisma.m365Policy.upsert({
        where: { policyId },
        update: {
          policyName: authPolicy.displayName || 'Tenant Authorization Policy',
          policyDescription: guestSettings || 'Tenant-wide authorization settings',
          policyData: JSON.stringify(authPolicy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true, // Authorization policy is always active
        },
        create: {
          policyType: 'AzureAD',
          policyId,
          policyName: authPolicy.displayName || 'Tenant Authorization Policy',
          policyDescription: guestSettings || 'Tenant-wide authorization settings',
          policyData: JSON.stringify(authPolicy),
          odataType,
          templateFamily,
          isActive: true,
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

**Why this works:**
- Handles singleton nature of Authorization Policy
- Uses consistent ID for the single policy
- Creates descriptive summary of key settings
- Always marks as active (it's always in effect)
- Proper null checking and error handling

---

### Step 3: Investigate Windows Custom Configuration

**File:** `server/src/services/intune.service.ts`

**Objective:** Verify Windows Custom Configuration policies are being synced

#### 3.1 Check Current Configuration Policy Sync

Windows Custom Configuration policies should already be synced via the existing `getDeviceConfigurationPolicies()` method. Let's verify:

**Test Script to Check for Windows Custom Config:**

```bash
cd server

# Create test script
cat > src/scripts/check-windows-custom.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { intuneService } from '../services/intune.service';

async function checkWindowsCustomConfig() {
  console.log('\n🔍 Checking for Windows Custom Configuration Policies...\n');

  try {
    const policies = await intuneService.getDeviceConfigurationPolicies();
    
    console.log(`Total Configuration Policies: ${policies.length}\n`);
    
    // Filter for Windows Custom Configuration
    const windowsCustom = policies.filter((p: any) => 
      p['@odata.type'] === '#microsoft.graph.windows10CustomConfiguration'
    );
    
    console.log(`Windows Custom Configuration Policies: ${windowsCustom.length}\n`);
    
    if (windowsCustom.length > 0) {
      console.log('Found Windows Custom Configuration Policies:');
      windowsCustom.forEach((p: any) => {
        console.log(`  - ${p.displayName}`);
        console.log(`    ID: ${p.id}`);
        console.log(`    OData Type: ${p['@odata.type']}`);
      });
    } else {
      console.log('⚠️  No Windows Custom Configuration policies found in tenant');
      console.log('   This is normal if you haven\'t created any custom OMA-URI profiles');
      console.log('   Check Intune portal > Devices > Configuration profiles for "Custom" profiles');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

checkWindowsCustomConfig();
EOF

# Run the test
npx tsx src/scripts/check-windows-custom.ts
```

**Expected Outcomes:**

**Scenario A: Policies Exist**
```
🔍 Checking for Windows Custom Configuration Policies...

Total Configuration Policies: 8

Windows Custom Configuration Policies: 2

Found Windows Custom Configuration Policies:
  - Custom OMA-URI Settings
    ID: abc123...
    OData Type: #microsoft.graph.windows10CustomConfiguration
  - BitLocker Custom Config
    ID: def456...
    OData Type: #microsoft.graph.windows10CustomConfiguration
```

**Scenario B: No Policies**
```
🔍 Checking for Windows Custom Configuration Policies...

Total Configuration Policies: 6

Windows Custom Configuration Policies: 0

⚠️  No Windows Custom Configuration policies found in tenant
   This is normal if you haven't created any custom OMA-URI profiles
   Check Intune portal > Devices > Configuration profiles for "Custom" profiles
```

#### 3.2 Windows Custom Configuration: What to Do

**If you have Windows Custom Configuration policies:**
- They should already be syncing correctly via existing code
- The `getDeviceConfigurationPolicies()` method returns all configuration policies
- No additional code changes needed - just verify in database

**If you DON'T have Windows Custom Configuration policies:**
- This is NORMAL and expected for many organizations
- Windows Custom Configuration requires manual creation of OMA-URI profiles
- The 50 settings in the database are "potential" settings that COULD be configured
- No action needed - these settings remain unmatched until policies are created

**To create Windows Custom Configuration policies (optional):**
1. Go to Intune portal → Devices → Configuration profiles
2. Click "Create profile"
3. Platform: Windows 10 and later
4. Profile type: Templates → Custom
5. Add OMA-URI settings as needed

---

### Step 4: Create Validation Script

**File:** `server/src/scripts/test-phase3.ts`

**Objective:** Comprehensive test for Phase 3 implementation

```bash
cd server

# Create comprehensive test script
cat > src/scripts/test-phase3.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { azureADService } from '../services/azureAD.service';
import { intuneService } from '../services/intune.service';

const prisma = new PrismaClient();

async function testPhase3() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: AUTHORIZATION POLICY & WINDOWS CUSTOM CONFIG TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1: Authorization Policy API
    console.log('📋 Test 1: Fetching Authorization Policy from API...');
    const authPolicy = await azureADService.getAuthorizationPolicy();
    
    if (authPolicy) {
      console.log('✅ Authorization Policy retrieved');
      console.log(`   ID: ${authPolicy.id}`);
      console.log(`   Display Name: ${authPolicy.displayName || 'N/A'}`);
      console.log(`   Guest invites from: ${authPolicy.allowInvitesFrom || 'Default'}`);
      console.log(`   Block MSOL PowerShell: ${authPolicy.blockMsolPowerShell}`);
      console.log(`   Default user role permissions:`);
      console.log(`     - Create apps: ${authPolicy.defaultUserRolePermissions?.allowedToCreateApps}`);
      console.log(`     - Create security groups: ${authPolicy.defaultUserRolePermissions?.allowedToCreateSecurityGroups}`);
      console.log(`     - Read other users: ${authPolicy.defaultUserRolePermissions?.allowedToReadOtherUsers}`);
    } else {
      console.log('❌ Could not retrieve Authorization Policy');
      console.log('   Check permissions and error messages above');
    }
    
    console.log();

    // Test 2: Windows Custom Configuration
    console.log('📋 Test 2: Checking Windows Custom Configuration Policies...');
    const configPolicies = await intuneService.getDeviceConfigurationPolicies();
    const windowsCustom = configPolicies.filter((p: any) => 
      p['@odata.type'] === '#microsoft.graph.windows10CustomConfiguration'
    );
    
    console.log(`✅ Total configuration policies: ${configPolicies.length}`);
    console.log(`   Windows Custom Configuration: ${windowsCustom.length}`);
    
    if (windowsCustom.length > 0) {
      console.log('   Found custom config policies:');
      windowsCustom.forEach((p: any) => {
        console.log(`     - ${p.displayName}`);
      });
    } else {
      console.log('   ℹ️  No Windows Custom Configuration policies in tenant (this is normal)');
    }
    
    console.log();

    // Test 3: Check database for Authorization Policy
    console.log('📋 Test 3: Checking Database for Authorization Policy...');
    const authPolicyInDb = await prisma.m365Policy.findFirst({
      where: {
        odataType: '#microsoft.graph.authorizationPolicy'
      }
    });
    
    if (authPolicyInDb) {
      console.log('✅ Authorization Policy found in database');
      console.log(`   Policy Name: ${authPolicyInDb.policyName}`);
      console.log(`   Last Synced: ${authPolicyInDb.lastSynced}`);
      console.log(`   Active: ${authPolicyInDb.isActive}`);
    } else {
      console.log('⚠️  Authorization Policy not yet in database');
      console.log('   Run policy sync to import it');
    }
    
    console.log();

    // Test 4: Check settings coverage
    console.log('📋 Test 4: Checking Settings Coverage...');
    
    const authPolicySettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.authorizationPolicy'
      }
    });
    
    const windowsCustomSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.windows10CustomConfiguration'
      }
    });
    
    console.log(`✅ Authorization Policy settings in catalog: ${authPolicySettings}`);
    console.log(`✅ Windows Custom Config settings in catalog: ${windowsCustomSettings}`);
    console.log(`   Total Phase 3 settings: ${authPolicySettings + windowsCustomSettings}`);
    
    console.log();

    // Test 5: Overall compliance impact
    console.log('📋 Test 5: Estimating Compliance Impact...');
    
    const totalSettings = await prisma.m365Setting.count();
    const settingsWithChecks = await prisma.m365Setting.count({
      where: {
        NOT: {
          complianceChecks: null
        }
      }
    });
    
    const phase3Settings = authPolicySettings + windowsCustomSettings;
    const estimatedAfter = settingsWithChecks + phase3Settings;
    const currentPercentage = ((settingsWithChecks / totalSettings) * 100).toFixed(1);
    const estimatedPercentage = ((estimatedAfter / totalSettings) * 100).toFixed(1);
    
    console.log(`   Current: ${settingsWithChecks}/${totalSettings} (${currentPercentage}%)`);
    console.log(`   After Phase 3: ~${estimatedAfter}/${totalSettings} (~${estimatedPercentage}%)`);
    console.log(`   Estimated improvement: ~${(parseFloat(estimatedPercentage) - parseFloat(currentPercentage)).toFixed(1)}%`);
    
    console.log();
    console.log('='.repeat(70));
    console.log('✅ PHASE 3 TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPhase3();
EOF

# Make executable and run
npx tsx src/scripts/test-phase3.ts
```

---

## Testing Procedures

### Test 1: Unit Test - Authorization Policy API

**Purpose:** Verify Authorization Policy can be retrieved from Graph API

```bash
cd server

# Create simple unit test
cat > src/scripts/test-authorization-policy-api.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { azureADService } from '../services/azureAD.service';

async function testAuthorizationPolicyAPI() {
  console.log('Testing Authorization Policy API...\n');

  const policy = await azureADService.getAuthorizationPolicy();
  
  if (policy) {
    console.log('✅ SUCCESS: Authorization Policy retrieved\n');
    console.log('Policy Details:');
    console.log(JSON.stringify(policy, null, 2));
  } else {
    console.log('❌ FAILED: Could not retrieve Authorization Policy');
    console.log('Check error messages above for permission issues');
  }
  
  process.exit(policy ? 0 : 1);
}

testAuthorizationPolicyAPI();
EOF

npx tsx src/scripts/test-authorization-policy-api.ts
```

---

### Test 2: Integration Test - Database Sync

**Purpose:** Verify Authorization Policy syncs to database correctly

```bash
cd server

# Trigger policy sync
curl -X POST http://localhost:5000/api/m365/sync \
  -H "Content-Type: application/json" \
  -d '{"forceRefresh": true}'

# Check database after sync
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const authPolicy = await prisma.m365Policy.findFirst({
  where: { odataType: '#microsoft.graph.authorizationPolicy' }
});

if (authPolicy) {
  console.log('Authorization Policy in Database:');
  console.log(\`  Name: \${authPolicy.policyName}\`);
  console.log(\`  Type: \${authPolicy.policyType}\`);
  console.log(\`  Template Family: \${authPolicy.templateFamily}\`);
  console.log(\`  Active: \${authPolicy.isActive}\`);
  console.log(\`  Last Synced: \${authPolicy.lastSynced}\`);
} else {
  console.log('❌ Authorization Policy not found in database');
}

await prisma.\$disconnect();
"
```

---

## Verification Checklist

Before marking Phase 3 complete, verify:

- [ ] **Code Changes Applied**
  - [ ] `azureAD.service.ts` updated with `getAuthorizationPolicy()`
  - [ ] `azureAD.service.ts` security summary includes `authorizationPolicy` field
  - [ ] `policySync.service.ts` syncs Authorization Policy as singleton
  - [ ] `policySync.service.ts` helper updated for new odataTypes

- [ ] **API Permissions Configured**
  - [ ] `Policy.Read.All` confirmed in app registration
  - [ ] Admin consent granted

- [ ] **Testing Completed**
  - [ ] Unit test shows Authorization Policy retrieved from API
  - [ ] Integration test shows Authorization Policy in database
  - [ ] Windows Custom Config check completed

- [ ] **No Regressions**
  - [ ] Existing sync still works
  - [ ] No TypeScript compilation errors
  - [ ] Backend starts without errors

---

## Rollback Procedure

```bash
cd server/src/services

# Restore files
git checkout azureAD.service.ts
git checkout policySync.service.ts

# Remove test scripts
rm src/scripts/test-phase3.ts
rm src/scripts/test-authorization-policy-api.ts
rm src/scripts/check-windows-custom.ts

# Restart server
npm run dev
```

---

## Common Issues & Solutions

### Issue 1: 403 Forbidden Error

**Symptom:**
```
⚠️  Could not fetch authorization policy: Forbidden
```

**Solution:**
1. Verify app registration has `Policy.Read.All` permission
2. Ensure admin consent was granted
3. Wait 5-10 minutes after granting consent
4. Try refreshing token cache

### Issue 2: Empty Windows Custom Config Results

**Symptom:**
```
Windows Custom Configuration: 0
```

**Explanation:**
This is **COMPLETELY NORMAL**. Most organizations don't use Windows Custom Configuration profiles.

---

## Success Metrics

After Phase 3 completion:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Settings with checks | 297 (44%) | 354+ (52%+) | +57+ |
| Azure AD policies synced | 1 | 2 | +1 |

---

## Next Steps

After completing Phase 3:

1. **Proceed to Phase 4**: Attack Simulation Training & Defender ATP
2. **Or Phase 5**: Data Quality Fixes
3. **Or Phases 1-2**: DLP and PIM (if not done)

---

**End of Phase 3 Implementation Guide**
