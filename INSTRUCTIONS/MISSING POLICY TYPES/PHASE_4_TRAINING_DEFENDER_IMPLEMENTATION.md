# Phase 4: Attack Simulation Training & Defender ATP Implementation

## Overview

**Goal:** Add Attack Simulation Training and Windows Defender ATP Configuration policy syncing to the NIST 800-171 compliance application

**Impact:** 
- Adds 21 settings with compliance checks (12 from Attack Simulation, 9 from Defender ATP)
- Improves coverage by approximately 3 percentage points
- Targets controls in the AT (Awareness and Training) and SI (System and Information Integrity) families

**Priority:** LOW - Nice to have for comprehensive coverage, but lower compliance impact

**Dependencies:** Can be implemented independently

---

## Prerequisites

### Required Permissions

Ensure your Azure AD app registration has these permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `AttackSimulation.Read.All` | Application | Read attack simulation campaigns |
| `DeviceManagementConfiguration.Read.All` | Application | Read Defender ATP config (should already exist) |

**To Grant Permissions:**
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. Select your application
3. Click "API permissions" → "Add a permission"
4. Select "Microsoft Graph" → "Application permissions"
5. Search for and add `AttackSimulation.Read.All`
6. Click "Grant admin consent" (requires Global Admin or Security Administrator)

### Environment Validation

```bash
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

### Step 1: Update Azure AD Service for Attack Simulation

**File:** `server/src/services/azureAD.service.ts`

**Objective:** Add Attack Simulation Training retrieval

#### 1.1 Add getAttackSimulations() Method

➕ **ADD AFTER:** `getAuthorizationPolicy()` method

```typescript
  /**
   * Fetch Attack Simulation Training campaigns
   * 
   * Note: Requires AttackSimulation.Read.All permission
   * Returns training simulations configured in Microsoft Defender for Office 365
   */
  async getAttackSimulations(): Promise<any[]> {
    try {
      console.log('Fetching Attack Simulation campaigns...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/security/attackSimulation/simulations'
      );

      console.log(`✅ Found ${response.value.length} attack simulation campaigns`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch attack simulations:', error.message);
      console.log('   This endpoint requires AttackSimulation.Read.All permission');
      console.log('   Attack simulations also require Microsoft Defender for Office 365 Plan 2');
      console.log('   If you see 403/404 errors, verify permissions and licensing');
      
      // Return empty array - attack simulations may not be configured
      return [];
    }
  }

  /**
   * Fetch Attack Simulation Training automations (optional)
   * 
   * Provides additional context about automated training campaigns
   */
  async getAttackSimulationAutomations(): Promise<any[]> {
    try {
      console.log('Fetching Attack Simulation automations...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/security/attackSimulation/simulationAutomations'
      );

      console.log(`✅ Found ${response.value.length} simulation automations`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch simulation automations:', error.message);
      
      // Return empty array - this is supplementary data
      return [];
    }
  }
```

#### 1.2 Update getSecuritySummary() Method

🔍 **FIND:**
```typescript
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

✏️ **REPLACE WITH:**
```typescript
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
    authorizationPolicy: any | null;
    attackSimulations: any[];
    attackSimulationAutomations: any[];
  }> {
    const [
      policies, 
      mfaStatus, 
      securityDefaults, 
      privilegedRoles, 
      authorizationPolicy,
      attackSimulations,
      attackSimulationAutomations
    ] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
      this.getAuthorizationPolicy(),
      this.getAttackSimulations(),
      this.getAttackSimulationAutomations(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
      authorizationPolicy,
      attackSimulations,
      attackSimulationAutomations,
    };
  }
```

---

### Step 2: Update Policy Sync Service

**File:** `server/src/services/policySync.service.ts`

**Objective:** Add Attack Simulation and Defender ATP syncing

#### 2.1 Update getTemplateFamilyFromOdataType() Helper

🔍 **FIND:** (Look for the section with Defender/Security types)

```typescript
    // Defender/Security
    if (odataType.includes('windowsDefenderAdvancedThreatProtection')) return 'DefenderSecurity';
    if (odataType.includes('endpointSecurityEndpointDetectionAndResponse')) return 'EndpointDetection';
```

✏️ **REPLACE WITH:**
```typescript
    // Defender/Security
    if (odataType.includes('windowsDefenderAdvancedThreatProtection')) return 'DefenderSecurity';
    if (odataType.includes('endpointSecurityEndpointDetectionAndResponse')) return 'EndpointDetection';
    
    // Attack Simulation Training (NEW)
    if (odataType.includes('attackSimulation')) return 'SecurityTraining';
```

#### 2.2 Add Attack Simulation Sync Logic

🔍 **FIND:** The end of `syncAzureADPolicies()` method (after Authorization Policy sync, before `return count;`)

➕ **ADD BEFORE:** `return count;`

```typescript
    // Sync Attack Simulation Training Campaigns (NEW)
    for (const simulation of data.attackSimulations || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: simulation.id },
      });

      const odataType = '#microsoft.graph.attackSimulationTraining';
      const templateFamily = 'SecurityTraining';

      // Create descriptive summary
      const description = [
        simulation.attackTechnique ? `Technique: ${simulation.attackTechnique}` : null,
        simulation.status ? `Status: ${simulation.status}` : null,
        simulation.payload?.name ? `Payload: ${simulation.payload.name}` : null,
      ].filter(Boolean).join(', ');

      const result = await prisma.m365Policy.upsert({
        where: { policyId: simulation.id },
        update: {
          policyName: simulation.displayName || 'Attack Simulation Campaign',
          policyDescription: description || 'Security awareness training simulation',
          policyData: JSON.stringify(simulation),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: simulation.status === 'running' || simulation.status === 'scheduled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: simulation.id,
          policyName: simulation.displayName || 'Attack Simulation Campaign',
          policyDescription: description || 'Security awareness training simulation',
          policyData: JSON.stringify(simulation),
          odataType,
          templateFamily,
          isActive: simulation.status === 'running' || simulation.status === 'scheduled',
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync Attack Simulation Automations (NEW)
    for (const automation of data.attackSimulationAutomations || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: automation.id },
      });

      const odataType = '#microsoft.graph.attackSimulationAutomation';
      const templateFamily = 'SecurityTraining';

      const result = await prisma.m365Policy.upsert({
        where: { policyId: automation.id },
        update: {
          policyName: automation.displayName || 'Attack Simulation Automation',
          policyDescription: automation.description || 'Automated security training',
          policyData: JSON.stringify(automation),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: automation.status === 'running',
        },
        create: {
          policyType: 'AzureAD',
          policyId: automation.id,
          policyName: automation.displayName || 'Attack Simulation Automation',
          policyDescription: automation.description || 'Automated security training',
          policyData: JSON.stringify(automation),
          odataType,
          templateFamily,
          isActive: automation.status === 'running',
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }
```

---

### Step 3: Verify Defender ATP Configuration

**Windows Defender ATP should already be syncing via Intune.**

**Test Script:**

```bash
cd server

cat > src/scripts/check-defender-atp.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { intuneService } from '../services/intune.service';

async function checkDefenderATP() {
  console.log('\n🔍 Checking for Windows Defender ATP Configuration...\n');

  try {
    const policies = await intuneService.getDeviceConfigurationPolicies();
    
    const defenderATP = policies.filter((p: any) => 
      p['@odata.type'] === '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration'
    );
    
    console.log(`Total Configuration Policies: ${policies.length}`);
    console.log(`Windows Defender ATP Policies: ${defenderATP.length}\n`);
    
    if (defenderATP.length > 0) {
      console.log('✅ Found Defender ATP Configuration:');
      defenderATP.forEach((p: any) => {
        console.log(`  - ${p.displayName}`);
      });
    } else {
      console.log('⚠️  No Defender ATP configuration found');
      console.log('   This requires Microsoft Defender for Endpoint licensing');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

checkDefenderATP();
EOF

npx tsx src/scripts/check-defender-atp.ts
```

---

### Step 4: Create Phase 4 Test Script

```bash
cd server

cat > src/scripts/test-phase4.ts << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { azureADService } from '../services/azureAD.service';
import { intuneService } from '../services/intune.service';

const prisma = new PrismaClient();

async function testPhase4() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: ATTACK SIMULATION & DEFENDER ATP TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1: Attack Simulation API
    console.log('📋 Test 1: Fetching Attack Simulations from API...');
    const simulations = await azureADService.getAttackSimulations();
    console.log(`✅ Attack Simulations: ${simulations.length}`);
    
    if (simulations.length > 0) {
      simulations.forEach((sim: any) => {
        console.log(`   - ${sim.displayName} (${sim.status})`);
      });
    } else {
      console.log('   ℹ️  No attack simulations configured (normal if not using Defender for Office 365)');
    }
    console.log();

    // Test 2: Defender ATP
    console.log('📋 Test 2: Checking Defender ATP Configuration...');
    const configPolicies = await intuneService.getDeviceConfigurationPolicies();
    const defenderATP = configPolicies.filter((p: any) => 
      p['@odata.type'] === '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration'
    );
    console.log(`✅ Defender ATP policies: ${defenderATP.length}`);
    console.log();

    // Test 3: Database check
    console.log('📋 Test 3: Checking Database...');
    const attackSimInDb = await prisma.m365Policy.count({
      where: {
        odataType: {
          contains: 'attackSimulation'
        }
      }
    });
    console.log(`✅ Attack Simulation policies in DB: ${attackSimInDb}`);
    console.log();

    // Test 4: Settings coverage
    console.log('📋 Test 4: Checking Settings Coverage...');
    const attackSimSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: {
          contains: 'attackSimulation'
        }
      }
    });
    const defenderATPSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration'
      }
    });
    
    console.log(`✅ Attack Simulation settings: ${attackSimSettings}`);
    console.log(`✅ Defender ATP settings: ${defenderATPSettings}`);
    console.log(`   Total Phase 4 settings: ${attackSimSettings + defenderATPSettings}`);
    
    console.log();
    console.log('='.repeat(70));
    console.log('✅ PHASE 4 TEST COMPLETED');
    console.log('='.repeat(70));
    
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPhase4();
EOF

npx tsx src/scripts/test-phase4.ts
```

---

## Common Issues & Solutions

### Issue 1: 403 Forbidden - Attack Simulations

**Symptom:**
```
⚠️  Could not fetch attack simulations: Forbidden
```

**Solution:**
1. Verify `AttackSimulation.Read.All` permission is granted
2. Ensure admin consent was granted
3. **Important:** Attack Simulation requires Microsoft Defender for Office 365 Plan 2

### Issue 2: Empty Results - Normal Scenarios

**Attack Simulations: 0**
- Requires Defender for Office 365 Plan 2 license
- Requires manual configuration of simulation campaigns
- Most organizations don't use this feature

**Defender ATP: 0**
- Requires Microsoft Defender for Endpoint license
- Requires manual configuration in Intune
- Settings remain unmatched until configured

---

## Success Metrics

After Phase 4 completion:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Settings with checks | 354 (52%) | 375+ (55%+) | +21 |
| Policy types synced | 22 | 24+ | +2 |

**Note:** Actual numbers depend on whether you have Attack Simulation and Defender ATP configured.

---

## Next Steps

After Phase 4:
1. **Proceed to Phase 5**: Data Quality Fixes (critical!)
2. **Or Phase 6**: Final Validation & Documentation

---

**End of Phase 4 Implementation Guide**
