# Missing Policy Types Implementation Guide

## Overview

This document details all missing M365 policy types that need to be synced to achieve full compliance coverage, plus additional data issues discovered during implementation.

**Date:** November 19, 2025 (Updated)
**Priority:** High - Required for accurate compliance reporting

---

## Current State Summary (After Quick Win)

### Completed Work
- **Policy sync code updated** to properly set `odataType` and `templateFamily` for all policy types
- **Existing policies updated** with correct metadata
- Files modified:
  - `server/src/services/policySync.service.ts` - Added `getTemplateFamilyFromOdataType()` helper and updated all sync methods
  - `server/src/scripts/update-policy-metadata.ts` - Script to update existing policies

### Database Statistics
- **Total Active Settings:** 672
- **Settings with Compliance Checks:** 297 (44%)
- **Settings WITHOUT Checks:** 375 (56%)
- **Controls Affected:** 70
- **Control-Setting Mappings Affected:** 250

### Currently Synced Policy Types
| Source | Policy Type | Template Family | Count |
|--------|-------------|-----------------|-------|
| Intune | Device Compliance | Compliance | 3 |
| Intune | Windows Update | Update | 1 |
| Intune | iOS Configuration | Configuration | 1 |
| Intune | App Protection (iOS/Android) | AppProtection | 2 |
| Intune | Settings Catalog - Baseline | SecurityBaseline | 3 |
| Intune | Settings Catalog - ASR | AttackSurfaceReduction | 2 |
| Intune | Settings Catalog - BitLocker | DiskEncryption | 1 |
| Intune | Settings Catalog - EDR | EndpointDetection | 2 |
| Intune | Settings Catalog - Custom | Configuration | 5 |
| Azure AD | Conditional Access | ConditionalAccess | 1 |
| **Total** | | | **21** |

---

## Issues to Address

### Issue 1: Missing Policy Types (318 settings)

These policy types need to be synced from M365:

| Template | Settings | Family | Priority |
|----------|----------|--------|----------|
| `#microsoft.graph.dataLossPreventionPolicy` | 95 | Purview | High |
| `#microsoft.graph.privilegedIdentityManagement` | 95 | IdentityGovernance | High |
| `#microsoft.graph.authorizationPolicy` | 57 | AzureAD | Medium |
| `#microsoft.graph.windows10CustomConfiguration` | 50 | Configuration | Medium |
| `#microsoft.graph.attackSimulationTraining` | 12 | SecurityTraining | Low |
| `#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration` | 9 | DefenderSecurity | Low |

### Issue 2: Settings with NULL Template (57 settings)

57 settings have no `policyTemplate` assigned. These need to be categorized and assigned appropriate templates so they can match policies.

### Issue 3: Incorrect Setting Templates (Data Quality Issue)

Many settings have incorrect `policyTemplate` values. Examples discovered during validation:

| Setting | Current Template | Correct Template |
|---------|-----------------|------------------|
| AppLocker - Executable and DLL Rules | `#microsoft.graph.iosManagedAppProtection` | Should be Windows policy |
| Enable Credential Guard | `#microsoft.graph.iosManagedAppProtection` | Should be Windows policy |
| PowerShell: Turn on Module Logging | `#microsoft.graph.iosManagedAppProtection` | Should be Windows policy |
| Microsoft Defender Antivirus - Automatic Remediation | `#microsoft.graph.iosManagedAppProtection` | Should be Defender policy |

These Windows-specific settings are incorrectly assigned to iOS App Protection templates and will never match correctly.

**Recommendation:** Audit the `M365Setting` table for settings with mismatched `policyTemplate` values. Focus on settings where the template family doesn't match the setting's purpose (e.g., Windows settings with iOS templates).

---

## Missing Policy Types - Implementation Details

### 1. Data Loss Prevention Policies (Purview DLP)

**Settings Affected:** 95
**Template Family:** Purview
**OData Type:** `#microsoft.graph.dataLossPreventionPolicy`

#### Graph API Details
```
Endpoint: /security/informationProtection/dataLossPreventionPolicies
API Version: Beta
Method: GET
```

#### Required Permissions
- `InformationProtectionPolicy.Read.All`
- Or `SecurityEvents.Read.All`

#### Current Status
- Placeholder exists in `purview.service.ts` (`getDLPPolicies()`) but returns empty array

#### Code Changes Required

**File:** `server/src/services/purview.service.ts`

Replace the placeholder `getDLPPolicies()` method:

```typescript
/**
 * Fetch DLP policies from Graph API
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
    return [];
  }
}
```

Update `getInformationProtectionSummary()`:

```typescript
async getInformationProtectionSummary(): Promise<{
  sensitivityLabelsCount: number;
  isConfigured: boolean;
  labels: PurviewSensitivityLabel[];
  dlpPolicies: any[];
}> {
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

**File:** `server/src/services/policySync.service.ts`

Update `syncPurviewPolicies()` to also sync DLP policies:

```typescript
// Sync DLP policies (NEW)
for (const policy of data.dlpPolicies || []) {
  const existing = await prisma.m365Policy.findUnique({
    where: { policyId: policy.id },
  });

  const result = await prisma.m365Policy.upsert({
    where: { policyId: policy.id },
    update: {
      policyName: policy.name || policy.displayName,
      policyDescription: policy.description || '',
      policyData: JSON.stringify(policy),
      odataType: '#microsoft.graph.dataLossPreventionPolicy',
      templateFamily: 'Purview',
      lastSynced: new Date(),
      isActive: policy.mode !== 'disabled',
    },
    create: {
      policyType: 'Purview',
      policyId: policy.id,
      policyName: policy.name || policy.displayName,
      policyDescription: policy.description || '',
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
```

---

### 2. Privileged Identity Management (PIM)

**Settings Affected:** 95
**Template Family:** IdentityGovernance
**OData Type:** `#microsoft.graph.privilegedIdentityManagement`

#### Graph API Details
```
Endpoints:
  - /policies/roleManagementPolicies
  - /roleManagement/directory/roleAssignmentScheduleInstances

API Version: v1.0 or Beta
Method: GET
```

#### Required Permissions
- `RoleManagement.Read.Directory`
- `PrivilegedAccess.Read.AzureAD`

#### Code Changes Required

**File:** `server/src/services/azureAD.service.ts`

Add new method:

```typescript
/**
 * Fetch PIM Role Management Policies
 */
async getPIMRoleManagementPolicies(): Promise<any[]> {
  try {
    console.log('Fetching PIM Role Management Policies...');

    const response = await graphClientService.get<{ value: any[] }>(
      '/policies/roleManagementPolicies'
    );

    console.log(`✅ Found ${response.value.length} PIM role management policies`);
    return response.value;
  } catch (error: any) {
    console.error('⚠️  Could not fetch PIM policies:', error.message);
    console.log('   This endpoint requires RoleManagement.Read.Directory permission');
    return [];
  }
}
```

Update `getSecuritySummary()` to include PIM data.

**File:** `server/src/services/policySync.service.ts`

Add PIM policy sync in `syncAzureADPolicies()`:

```typescript
// Sync PIM Policies (NEW)
for (const pimPolicy of data.pimPolicies || []) {
  const existing = await prisma.m365Policy.findUnique({
    where: { policyId: pimPolicy.id },
  });

  const result = await prisma.m365Policy.upsert({
    where: { policyId: pimPolicy.id },
    update: {
      policyName: pimPolicy.displayName,
      policyDescription: pimPolicy.description || `Scope: ${pimPolicy.scopeType}`,
      policyData: JSON.stringify(pimPolicy),
      odataType: '#microsoft.graph.privilegedIdentityManagement',
      templateFamily: 'IdentityGovernance',
      lastSynced: new Date(),
      isActive: true,
    },
    create: {
      policyType: 'AzureAD',
      policyId: pimPolicy.id,
      policyName: pimPolicy.displayName,
      policyDescription: pimPolicy.description || `Scope: ${pimPolicy.scopeType}`,
      policyData: JSON.stringify(pimPolicy),
      odataType: '#microsoft.graph.privilegedIdentityManagement',
      templateFamily: 'IdentityGovernance',
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

### 3. Authorization Policy (Azure AD)

**Settings Affected:** 57
**Template Family:** AzureAD
**OData Type:** `#microsoft.graph.authorizationPolicy`

#### Graph API Details
```
Endpoint: /policies/authorizationPolicy
API Version: v1.0
Method: GET
```

#### Required Permissions
- `Policy.Read.All`

#### Important Notes
This is a **singleton resource** - there's only ONE authorization policy per tenant. It contains:
- Guest user access restrictions
- Guest invite settings
- User consent settings
- Default user role permissions

#### Code Changes Required

**File:** `server/src/services/azureAD.service.ts`

Add new method:

```typescript
/**
 * Fetch Authorization Policy (singleton - one per tenant)
 */
async getAuthorizationPolicy(): Promise<any | null> {
  try {
    console.log('Fetching Authorization Policy...');

    const response = await graphClientService.get(
      '/policies/authorizationPolicy'
    );

    console.log('✅ Retrieved authorization policy');
    return response;
  } catch (error: any) {
    console.error('⚠️  Could not fetch authorization policy:', error.message);
    return null;
  }
}
```

---

### 4. Attack Simulation Training

**Settings Affected:** 12
**Template Family:** SecurityTraining
**OData Type:** `#microsoft.graph.attackSimulationTraining`

#### Graph API Details
```
Endpoint: /security/attackSimulation/simulations
API Version: v1.0 or Beta
Method: GET
```

#### Required Permissions
- `AttackSimulation.Read.All`

#### Code Changes Required

**File:** `server/src/services/azureAD.service.ts`

Add new method:

```typescript
/**
 * Fetch Attack Simulation Training campaigns
 */
async getAttackSimulations(): Promise<any[]> {
  try {
    console.log('Fetching Attack Simulation campaigns...');

    const response = await graphClientService.get<{ value: any[] }>(
      '/security/attackSimulation/simulations'
    );

    console.log(`✅ Found ${response.value.length} attack simulations`);
    return response.value;
  } catch (error: any) {
    console.error('⚠️  Could not fetch attack simulations:', error.message);
    return [];
  }
}
```

---

### 5. Windows Custom Configuration

**Settings Affected:** 50
**Template Family:** Configuration
**OData Type:** `#microsoft.graph.windows10CustomConfiguration`

#### Current Status
Should be syncing via `getDeviceConfigurationPolicies()` but may not have any policies of this type in your tenant.

#### Investigation Required
Check if you have any custom OMA-URI configuration profiles in Intune:
1. Go to Intune portal > Devices > Configuration profiles
2. Look for "Custom" profiles for Windows 10/11

If they exist in Intune but not in the database, there may be a sync issue.

---

### 6. Windows Defender ATP Configuration

**Settings Affected:** 9
**Template Family:** DefenderSecurity
**OData Type:** `#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration`

#### Current Status
Should be syncing via `getDeviceConfigurationPolicies()`.

#### Investigation Required
Check if you have any Defender ATP configuration profiles:
1. Go to Intune portal > Devices > Configuration profiles
2. Look for profiles with template "Microsoft Defender for Endpoint"

---

## Implementation Checklist

### Phase 1: Add High-Priority Policy Types (190 settings)
- [ ] Implement `getDLPPolicies()` in `purview.service.ts`
- [ ] Update `getInformationProtectionSummary()` to include DLP
- [ ] Update `syncPurviewPolicies()` to sync DLP policies
- [ ] Implement `getPIMRoleManagementPolicies()` in `azureAD.service.ts`
- [ ] Update `getSecuritySummary()` to include PIM
- [ ] Update `syncAzureADPolicies()` to sync PIM policies
- [ ] Test sync and verify policies appear

### Phase 2: Add Medium-Priority Policy Types (107 settings)
- [ ] Implement `getAuthorizationPolicy()` in `azureAD.service.ts`
- [ ] Update sync to handle authorization policy
- [ ] Investigate Windows Custom Configuration sync issue
- [ ] Create Windows Custom Config policies if needed

### Phase 3: Add Low-Priority Policy Types (21 settings)
- [ ] Implement `getAttackSimulations()` in `azureAD.service.ts`
- [ ] Update sync to handle attack simulations
- [ ] Investigate Defender ATP configuration sync issue

### Phase 4: Fix Setting Template Data (57+ settings)
- [ ] Audit settings with NULL templates
- [ ] Assign correct templates to NULL settings
- [ ] Audit settings with incorrect templates (Windows settings with iOS templates)
- [ ] Fix incorrect template assignments
- [ ] Document the correct template for each setting category

### Phase 5: Validation & Testing
- [ ] Run full policy sync
- [ ] Run `npx tsx server/src/scripts/revalidate-all.ts`
- [ ] Run `npx tsx server/src/scripts/check-unmatched-settings.ts`
- [ ] Verify unmatched settings count is minimized
- [ ] Check control compliance percentages

---

## Required Permissions Summary

Ensure your Azure AD app registration has these permissions:

| Permission | Type | Required For |
|------------|------|--------------|
| `InformationProtectionPolicy.Read.All` | Application | DLP Policies |
| `RoleManagement.Read.Directory` | Application | PIM Policies |
| `Policy.Read.All` | Application | Authorization Policy |
| `AttackSimulation.Read.All` | Application | Attack Simulations |
| `DeviceManagementConfiguration.Read.All` | Application | Intune Configs (existing) |

---

## Testing Commands

After implementation, run these commands to verify:

```bash
# Update existing policies (if re-syncing)
npx tsx server/src/scripts/update-policy-metadata.ts

# Check database state
npx tsx server/src/scripts/check-db-state.ts

# Check unmatched settings
npx tsx server/src/scripts/check-unmatched-settings.ts

# Re-run validation
npx tsx server/src/scripts/revalidate-all.ts

# Check template matching
npx tsx server/src/scripts/check-template-matching.ts
```

---

## Expected Outcome

After full implementation:

| Metric | Current | After Phase 1 | After All Phases |
|--------|---------|---------------|------------------|
| Settings with checks | 297 (44%) | 487 (72%) | 615+ (91%+) |
| Unmatched settings | 375 | 185 | <60 |
| Affected controls | 70 | ~40 | <10 |
| Policy types synced | 21 | 23 | 27+ |

**Note:** The remaining unmatched settings after all phases will be those with:
- NULL templates that need manual assignment
- Incorrect templates that need manual correction

---

## Notes

1. **Beta API Usage**: DLP and some PIM endpoints require Graph API beta. Ensure `graphClientService.getBeta()` is working properly.

2. **Permission Errors**: If you get 403 errors, check app registration permissions in Azure AD and grant admin consent.

3. **Empty Results**: Some endpoints may return empty if you haven't configured those features in your tenant.

4. **Template Family Mapping**: The `templateFamily` values must match exactly what's in your `M365Setting` records.

5. **OData Type Format**: The `odataType` must include the `#microsoft.graph.` or `#settingsCatalog.` prefix to match setting templates.

6. **Data Quality**: Many settings appear to have incorrect `policyTemplate` values. This is a data quality issue that needs to be addressed separately from the missing policy types.
