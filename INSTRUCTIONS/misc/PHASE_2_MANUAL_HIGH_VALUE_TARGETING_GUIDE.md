# Phase 2: Manual High-Value Targeting - Implementation Guide

**Objective:** Target the 50 most important settings for manual property name research  
**Time Estimate:** 4-6 hours  
**Difficulty:** ⭐⭐ Medium (requires M365 research)  
**Expected Improvement:** +15-20% match rate (on top of Phase 1)

---

## Overview

Phase 2 focuses on **quality over quantity** by manually researching and mapping the settings that provide the most value. Instead of trying to fix all 456 settings, we identify the top 50 that:

1. Map to the most NIST controls
2. Map to high-priority (Critical/High) controls  
3. Appear in multiple policies
4. Are commonly used in compliance frameworks

This targeted approach gives you **80% of the benefit with 20% of the effort**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Identify High-Value Settings](#step-1-identify-high-value-settings)
3. [Step 2: Research Property Names](#step-2-research-property-names)
4. [Step 3: Apply Mappings](#step-3-apply-mappings)
5. [Step 4: Verify & Measure](#step-4-verify--measure)
6. [Alternative: Specialized Extractors](#alternative-specialized-extractors)

---

## Prerequisites

### Phase 1 Completion

Ensure Phase 1 is complete and successful:
- [ ] Pattern-based strategies implemented
- [ ] Reverse mappings applied
- [ ] Current match rate: 15-20%
- [ ] Baseline metrics documented

### Required Access

- ✅ Microsoft 365 Admin Portal access
- ✅ Intune admin access
- ✅ Azure AD admin access
- ✅ Purview/Compliance admin access

### Required Tools

- Microsoft Graph Explorer: https://developer.microsoft.com/graph/graph-explorer
- Intune portal: https://endpoint.microsoft.com
- Azure AD portal: https://portal.azure.com

---

## Step 1: Identify High-Value Settings

### 1.1 Create Identification Script

This script scores all settings based on their importance and generates a prioritized list.

📁 File: `server/src/scripts/identify-high-value-settings.ts`

🔄 COMPLETE FILE:
```typescript
/**
 * Identify High-Value Settings Script
 *
 * Scores settings by:
 * - Number of NIST controls mapped
 * - Priority of controls (Critical/High weighted higher)
 * - Number of policy occurrences
 * - Extraction failure rate
 *
 * Run with: npx tsx server/src/scripts/identify-high-value-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScoredSetting {
  id: number;
  displayName: string;
  settingName: string | null;
  settingPath: string;
  policyTemplate: string | null;
  templateFamily: string | null;
  
  // Scoring factors
  controlCount: number;
  criticalControlCount: number;
  highControlCount: number;
  mediumControlCount: number;
  policyOccurrences: number;
  currentExtractionRate: number;
  
  // Derived
  score: number;
  priority: 'Critical' | 'High' | 'Medium';
  
  // Reference data
  controlIds: string[];
  samplePolicyId?: number;
  samplePolicyName?: string;
}

async function identifyHighValueSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('HIGH-VALUE SETTINGS IDENTIFICATION');
  console.log('='.repeat(80) + '\n');

  // Get all settings with their control mappings
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
              priority: true,
              family: true
            }
          }
        }
      },
      complianceChecks: {
        select: {
          id: true,
          actualValue: true,
          policyId: true,
          policy: {
            select: {
              id: true,
              policyName: true
            }
          }
        }
      }
    }
  });

  console.log(`Analyzing ${settings.length} settings...\n`);

  const scoredSettings: ScoredSetting[] = [];

  for (const setting of settings) {
    // Count controls by priority
    const controlCount = setting.controlMappings.length;
    const criticalControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'Critical'
    ).length;
    const highControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'High'
    ).length;
    const mediumControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'Medium'
    ).length;

    // Skip settings with no control mappings
    if (controlCount === 0) continue;

    // Count policy occurrences
    const policyOccurrences = setting.complianceChecks.length;

    // Calculate current extraction rate
    const successfulExtractions = setting.complianceChecks.filter(
      c => c.actualValue !== null && c.actualValue !== 'null'
    ).length;
    const currentExtractionRate = policyOccurrences > 0
      ? successfulExtractions / policyOccurrences
      : 0;

    // Calculate score
    // Formula: (controls * 10) + (critical * 20) + (high * 10) + (medium * 5) + (occurrences * 3)
    // Penalty for already working: -50% if extraction rate > 80%
    let score = 
      (controlCount * 10) +
      (criticalControlCount * 20) +
      (highControlCount * 10) +
      (mediumControlCount * 5) +
      (policyOccurrences * 3);

    // Apply penalty for settings that are already working well
    if (currentExtractionRate > 0.8) {
      score = score * 0.5;
    }

    // Boost for settings that fail completely (high potential)
    if (currentExtractionRate === 0 && policyOccurrences > 0) {
      score = score * 1.5;
    }

    // Determine priority
    let priority: 'Critical' | 'High' | 'Medium';
    if (criticalControlCount > 0 || score >= 150) {
      priority = 'Critical';
    } else if (highControlCount > 0 || score >= 80) {
      priority = 'High';
    } else {
      priority = 'Medium';
    }

    // Get sample policy for research
    const sampleCheck = setting.complianceChecks[0];

    scoredSettings.push({
      id: setting.id,
      displayName: setting.displayName,
      settingName: setting.settingName,
      settingPath: setting.settingPath,
      policyTemplate: setting.policyTemplate,
      templateFamily: setting.templateFamily,
      controlCount,
      criticalControlCount,
      highControlCount,
      mediumControlCount,
      policyOccurrences,
      currentExtractionRate,
      score,
      priority,
      controlIds: setting.controlMappings.map(m => m.control.controlId),
      samplePolicyId: sampleCheck?.policy.id,
      samplePolicyName: sampleCheck?.policy.policyName
    });
  }

  // Sort by score descending
  scoredSettings.sort((a, b) => b.score - a.score);

  // Output results
  console.log('='.repeat(80));
  console.log('TOP 50 HIGH-VALUE SETTINGS');
  console.log('='.repeat(80) + '\n');

  const top50 = scoredSettings.slice(0, 50);

  for (const [idx, setting] of top50.entries()) {
    console.log(`\n${idx + 1}. ${setting.displayName}`);
    console.log(`   Priority: ${setting.priority} | Score: ${setting.score.toFixed(0)}`);
    console.log(`   Template: ${setting.policyTemplate || 'NULL'}`);
    console.log(`   Family: ${setting.templateFamily || 'NULL'}`);
    console.log(`   Current settingName: ${setting.settingName || 'NULL'}`);
    console.log(`   Current settingPath: ${setting.settingPath}`);
    console.log(`   Controls: ${setting.controlCount} total (${setting.criticalControlCount} critical, ${setting.highControlCount} high)`);
    console.log(`   Control IDs: ${setting.controlIds.slice(0, 5).join(', ')}${setting.controlIds.length > 5 ? '...' : ''}`);
    console.log(`   Policy occurrences: ${setting.policyOccurrences}`);
    console.log(`   Current extraction rate: ${(setting.currentExtractionRate * 100).toFixed(0)}%`);
    
    if (setting.samplePolicyId) {
      console.log(`   Sample policy: ${setting.samplePolicyName} (ID: ${setting.samplePolicyId})`);
    }
  }

  // Generate research tracking CSV
  console.log('\n' + '='.repeat(80));
  console.log('RESEARCH TRACKING TEMPLATE');
  console.log('='.repeat(80) + '\n');

  console.log('Copy this to a spreadsheet for tracking your research:\n');
  console.log('ID,Display Name,Template,Current Path,Research Status,Actual Property,Verified,Notes');
  
  for (const setting of top50) {
    const template = setting.policyTemplate?.replace('#microsoft.graph.', '') || 'NULL';
    console.log(
      `${setting.id},"${setting.displayName}","${template}","${setting.settingPath}",TODO,,,`
    );
  }

  // Generate research guide
  console.log('\n' + '='.repeat(80));
  console.log('RESEARCH METHODOLOGY');
  console.log('='.repeat(80) + '\n');

  console.log('For each setting above:');
  console.log('');
  console.log('1. IDENTIFY THE POLICY TYPE');
  console.log('   - Check the Template field');
  console.log('   - Map to M365 admin portal location');
  console.log('');
  console.log('2. FIND A SAMPLE POLICY');
  console.log('   - Use the Sample Policy ID from output');
  console.log('   - Or create a test policy with this setting configured');
  console.log('');
  console.log('3. GET THE ACTUAL PROPERTY NAME');
  console.log('   Method A: Graph Explorer');
  console.log('     - Query: GET /deviceManagement/deviceConfigurations/{id}');
  console.log('     - Or: GET /deviceManagement/deviceCompliancePolicies/{id}');
  console.log('     - Look for property names in JSON response');
  console.log('');
  console.log('   Method B: Admin Portal + Browser DevTools');
  console.log('     - Open policy in Intune portal');
  console.log('     - Open browser DevTools (F12) > Network tab');
  console.log('     - Edit the policy and save');
  console.log('     - Find the PATCH request and inspect JSON payload');
  console.log('');
  console.log('4. VERIFY THE PROPERTY');
  console.log('   - Ensure property exists in policyData');
  console.log('   - Check value type matches expected');
  console.log('   - Test with multiple policies if possible');
  console.log('');
  console.log('5. UPDATE THE SPREADSHEET');
  console.log('   - Mark status as "Researched"');
  console.log('   - Record actual property name');
  console.log('   - Add verification notes');
  console.log('');

  // Statistics
  console.log('\n' + '='.repeat(80));
  console.log('STATISTICS');
  console.log('='.repeat(80) + '\n');

  const criticalCount = top50.filter(s => s.priority === 'Critical').length;
  const highCount = top50.filter(s => s.priority === 'High').length;
  const mediumCount = top50.filter(s => s.priority === 'Medium').length;

  const totalControls = top50.reduce((sum, s) => sum + s.controlCount, 0);
  const uniqueControls = new Set(top50.flatMap(s => s.controlIds)).size;

  const templateDistribution = new Map<string, number>();
  for (const setting of top50) {
    const template = setting.policyTemplate || 'NULL';
    templateDistribution.set(template, (templateDistribution.get(template) || 0) + 1);
  }

  console.log(`Priority distribution:`);
  console.log(`  Critical: ${criticalCount}`);
  console.log(`  High: ${highCount}`);
  console.log(`  Medium: ${mediumCount}`);
  console.log(``);
  console.log(`Control coverage:`);
  console.log(`  Total control mappings: ${totalControls}`);
  console.log(`  Unique controls: ${uniqueControls}`);
  console.log(``);
  console.log(`Template distribution:`);
  const sortedTemplates = Array.from(templateDistribution.entries())
    .sort((a, b) => b[1] - a[1]);
  for (const [template, count] of sortedTemplates.slice(0, 10)) {
    const shortName = template.replace('#microsoft.graph.', '');
    console.log(`  ${shortName.padEnd(40)} ${count}`);
  }

  // Expected impact
  console.log('\n' + '='.repeat(80));
  console.log('EXPECTED IMPACT');
  console.log('='.repeat(80) + '\n');

  const currentFailures = top50.filter(s => s.currentExtractionRate < 0.5).length;
  const potentialPolicyMatches = top50.reduce((sum, s) => sum + s.policyOccurrences, 0);

  console.log(`Settings with poor extraction (<50%): ${currentFailures}`);
  console.log(`Total policy-setting combinations: ${potentialPolicyMatches}`);
  console.log(`Estimated new successful extractions: ${(potentialPolicyMatches * 0.7).toFixed(0)}`);
  console.log(``);
  console.log(`If you successfully map these 50 settings:`);
  console.log(`  - Expected match rate improvement: +15-20%`);
  console.log(`  - Additional controls covered: ${uniqueControls}`);
  console.log(`  - Better compliance accuracy for high-priority controls`);

  await prisma.$disconnect();
}

identifyHighValueSettings().catch(console.error);
```

### 1.2 Run the Identification Script

```bash
cd server
npx tsx src/scripts/identify-high-value-settings.ts > high-value-settings.txt
```

This generates:
- ✅ Top 50 settings ranked by importance
- ✅ CSV template for tracking research
- ✅ Research methodology guide
- ✅ Expected impact analysis

### 1.3 Review and Prioritize

Open the output file and review:

```bash
cat high-value-settings.txt
```

**Focus on:**
- Settings marked "Critical" priority
- Settings with 0% extraction rate (biggest opportunity)
- Settings mapping to multiple high-priority controls
- Common templates you can batch-research

---

## Step 2: Research Property Names

This is the manual research phase. Plan for **3-4 hours** of focused work.

### 2.1 Setup Research Environment

**Create a tracking spreadsheet:**
1. Copy the CSV output from Step 1.1
2. Import into Google Sheets or Excel
3. Add columns: `Research Date`, `Verified By`, `Confidence`

**Setup testing tools:**
1. Open Microsoft Graph Explorer: https://developer.microsoft.com/graph/graph-explorer
2. Sign in with your admin account
3. Open Intune portal in another tab: https://endpoint.microsoft.com

### 2.2 Research Methodology

For each of the top 50 settings, follow this process:

#### Method A: Graph Explorer (Recommended)

**Step 1: Identify the policy ID**
```
From your database, get the samplePolicyId for this setting
```

**Step 2: Query the policy via Graph**

For **Intune Device Configuration:**
```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations/{policyId}
```

For **Compliance Policies:**
```
GET https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies/{policyId}
```

For **Configuration Policies (Settings Catalog):**
```
GET https://graph.microsoft.com/beta/deviceManagement/configurationPolicies/{policyId}
```

For **Conditional Access:**
```
GET https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policyId}
```

**Step 3: Search the JSON response**
- Look for property names matching the setting's display name
- Check nested objects and arrays
- Note the exact property path

**Step 4: Record findings**
```
Setting: "Password Minimum Length"
Actual Property: "passwordMinimumLength"
Path: Direct property (not nested)
Value Type: integer
Verified: Yes
```

#### Method B: Browser DevTools (Alternative)

**Step 1: Open the policy in admin portal**
- Navigate to Intune or Azure AD portal
- Find a policy that uses this setting
- Open for editing

**Step 2: Enable Network monitoring**
- Press F12 to open DevTools
- Go to Network tab
- Filter for "Fetch/XHR"
- Click "Clear" to start fresh

**Step 3: Make a change**
- Edit any value in the policy
- Click Save
- Watch for PATCH/PUT requests

**Step 4: Inspect the payload**
- Find the request that updates the policy
- Look at Request Payload (JSON)
- Identify the property name used

**Step 5: Record findings**

#### Method C: Policy Export (Batch Research)

**For similar settings in same template:**

**Step 1: Export a configured policy**
```powershell
# Using Microsoft Graph PowerShell
Connect-MgGraph -Scopes "DeviceManagementConfiguration.Read.All"

$policy = Get-MgDeviceManagementDeviceConfiguration -DeviceConfigurationId {id}
$policy | ConvertTo-Json -Depth 10 > policy-export.json
```

**Step 2: Batch analyze**
- Open the JSON file
- Search for multiple setting names at once
- Map all visible properties

### 2.3 Research Tips

**Common Patterns:**

| Display Name Pattern | Likely Property Name |
|---------------------|---------------------|
| "Require [Something]" | `require[Something]` (camelCase) |
| "Enable [Feature]" | `[feature]Enabled` |
| "[Thing] Required" | `[thing]Required` |
| "Minimum [Property]" | `[property]Minimum` or `minimum[Property]` |
| "Block [Action]" | `block[Action]` or `[action]Blocked` |

**Template-Specific Notes:**

**Windows Compliance:**
- Properties are flat (not nested)
- Use camelCase
- Boolean values common
- Examples: `passwordRequired`, `osMinimumVersion`

**Settings Catalog:**
- Properties in `settings` array
- Match by `settingDefinitionId`
- Deeply nested: `settingInstance.simpleSettingValue.value`
- Examples: `device_vendor_msft_policy_config_*`

**Conditional Access:**
- Properties under `conditions` and `grantControls`
- Complex nested structure
- Examples: `conditions.applications.includeApplications`

**App Protection:**
- Properties under various sub-objects
- Examples: `periodOfflineBeforeWipeIsEnforced`, `pinRequired`

### 2.4 Documentation Template

For each researched setting:

```markdown
## Setting: [Display Name]
- **ID:** [Setting ID]
- **Template:** [Policy Template]
- **Current Path:** [Current settingPath]
- **Research Date:** [Date]

### Findings
- **Actual Property:** `propertyName`
- **Location:** Direct / Nested under X / Settings array
- **Value Type:** string / boolean / integer / object
- **Sample Value:** `example`

### Verification
- ✅ Tested with Policy ID: [ID]
- ✅ Value extracted successfully: Yes/No
- ✅ Matches expected type: Yes/No

### Notes
[Any additional observations]
```

---

## Step 3: Apply Mappings

### 3.1 Create Bulk Update Script

📁 File: `server/src/scripts/apply-manual-mappings.ts`

🔄 COMPLETE FILE:
```typescript
/**
 * Apply Manual Mappings Script
 *
 * Applies manually researched property names to high-value settings
 *
 * IMPORTANT: Review the mappings array carefully before running!
 *
 * Run with: npx tsx server/src/scripts/apply-manual-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ManualMapping {
  settingId: number;
  displayName: string; // For verification
  currentPath: string; // For verification
  newSettingName: string; // The actual property name discovered
  notes?: string;
  researchedBy?: string;
  researchDate?: string;
}

/**
 * Manual mappings from research
 * 
 * INSTRUCTIONS:
 * 1. Add your researched mappings here
 * 2. Double-check settingId and displayName match
 * 3. Verify newSettingName is the actual property from Graph API
 * 4. Run script to apply all at once
 */
const mappings: ManualMapping[] = [
  // ==================== WINDOWS COMPLIANCE POLICIES ====================
  // Example format (replace with your actual findings):
  // {
  //   settingId: 123,
  //   displayName: 'Intune - Password Required (Windows)',
  //   currentPath: 'passwordRequired',
  //   newSettingName: 'passwordRequired',
  //   notes: 'Direct property, boolean',
  //   researchedBy: 'Justin',
  //   researchDate: '2025-11-20'
  // },

  // ==================== SETTINGS CATALOG POLICIES ====================
  
  // ==================== CONDITIONAL ACCESS POLICIES ====================
  
  // ==================== APP PROTECTION POLICIES ====================
  
  // ADD YOUR MANUAL MAPPINGS HERE
  
];

async function applyManualMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLYING MANUAL MAPPINGS');
  console.log('='.repeat(80) + '\n');

  if (mappings.length === 0) {
    console.log('⚠️  No mappings defined!');
    console.log('');
    console.log('Please edit this file and add your researched mappings to the array.');
    console.log('');
    await prisma.$disconnect();
    return;
  }

  console.log(`Preparing to apply ${mappings.length} manual mappings...\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const mapping of mappings) {
    try {
      // Verify setting exists
      const setting = await prisma.m365Setting.findUnique({
        where: { id: mapping.settingId },
        select: {
          id: true,
          displayName: true,
          settingName: true,
          settingPath: true
        }
      });

      if (!setting) {
        console.log(`❌ Setting ${mapping.settingId} not found`);
        errorCount++;
        continue;
      }

      // Safety check: verify display name matches
      if (setting.displayName !== mapping.displayName) {
        console.log(`⚠️  SAFETY CHECK FAILED for setting ${mapping.settingId}:`);
        console.log(`   Expected display name: ${mapping.displayName}`);
        console.log(`   Actual display name: ${setting.displayName}`);
        console.log(`   SKIPPING for safety...`);
        skippedCount++;
        continue;
      }

      // Check if it's actually different
      if (setting.settingName === mapping.newSettingName) {
        console.log(`⏭️  ${setting.displayName}`);
        console.log(`   Already set to: ${setting.settingName}`);
        skippedCount++;
        continue;
      }

      // Apply the update
      await prisma.m365Setting.update({
        where: { id: mapping.settingId },
        data: {
          settingName: mapping.newSettingName,
          // Optionally update settingPath if provided differently
          ...(mapping.newSettingName !== mapping.currentPath && {
            settingPath: mapping.newSettingName
          })
        }
      });

      console.log(`✅ ${setting.displayName}`);
      console.log(`   ${setting.settingName || 'NULL'} → ${mapping.newSettingName}`);
      if (mapping.notes) {
        console.log(`   Notes: ${mapping.notes}`);
      }
      successCount++;

    } catch (error) {
      console.error(`❌ Failed to update setting ${mapping.settingId}:`, error);
      errorCount++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`  ✅ Applied: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${mappings.length}`);
  console.log('');

  if (successCount > 0) {
    console.log('✅ Mappings applied successfully!\n');
    console.log('Next steps:');
    console.log('  1. Rebuild compliance checks: npx tsx src/scripts/rebuild-compliance-checks.ts');
    console.log('  2. Analyze improvement: npx tsx src/scripts/final-coverage-analysis.ts');
    console.log('  3. Verify specific controls: npx tsx src/scripts/test-control-matching.ts');
    console.log('');
  }

  await prisma.$disconnect();
}

applyManualMappings().catch(console.error);
```

### 3.2 Add Your Mappings

Edit the script and add your researched mappings to the array:

```typescript
const mappings: ManualMapping[] = [
  {
    settingId: 123,
    displayName: 'Intune - Password Minimum Length',
    currentPath: 'passwordMinLength',
    newSettingName: 'passwordMinimumLength',
    notes: 'Direct property on windows10CompliancePolicy',
    researchedBy: 'Justin',
    researchDate: '2025-11-20'
  },
  // Add more mappings...
];
```

### 3.3 Validate Before Applying

**Dry-run check:**
```bash
cd server
npx tsc --noEmit src/scripts/apply-manual-mappings.ts
```

**Review the mappings:**
- Verify all settingIds are correct
- Confirm displayNames match database
- Double-check newSettingName values

### 3.4 Apply the Mappings

```bash
cd server
npx tsx src/scripts/apply-manual-mappings.ts
```

**Expected output:**
```
✅ Intune - Password Minimum Length
   passwordMinLength → passwordMinimumLength
✅ Intune - Require Encryption
   NULL → storageRequireEncryption
...
```

### 3.5 Backup First (Recommended)

```bash
# Backup database before bulk changes
cp database/compliance.db database/compliance.backup-phase2.db
```

---

## Step 4: Verify & Measure

### 4.1 Rebuild Compliance Checks

```bash
cd server
npx tsx src/scripts/rebuild-compliance-checks.ts
```

Watch for:
- Increased extraction success rates
- New controls showing compliant/non-compliant status
- Better distribution across policy templates

### 4.2 Run Coverage Analysis

```bash
npx tsx src/scripts/final-coverage-analysis.ts > phase2-results.txt
```

### 4.3 Compare Metrics

| Metric | Phase 1 | Phase 2 | Improvement |
|--------|---------|---------|-------------|
| Match Rate | __% | __% | +__% |
| Extracted Settings | __ | __ | +__ |
| Unique Controls | __ | __ | +__ |
| Critical Controls | __ | __ | +__ |
| High Priority Controls | __ | __ | +__ |

**Expected Phase 2 results:**
- Match rate: 30-40% (from 15-20%)
- +30-50 additional successful extractions
- +15-25 additional controls covered

### 4.4 Validate High-Priority Controls

Create a script to check if your high-value settings are now working:

📁 File: `server/src/scripts/validate-phase2-improvements.ts`

🔄 COMPLETE FILE:
```typescript
/**
 * Validate Phase 2 Improvements
 *
 * Checks if the manually mapped high-value settings are now extracting successfully
 *
 * Run with: npx tsx server/src/scripts/validate-phase2-improvements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateImprovements() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 VALIDATION REPORT');
  console.log('='.repeat(80) + '\n');

  // Get settings updated recently (Phase 2 changes)
  const recentlyUpdated = await prisma.m365Setting.findMany({
    where: {
      settingName: { not: null },
      isActive: true
    },
    include: {
      complianceChecks: {
        select: {
          id: true,
          actualValue: true,
          isCompliant: true,
          policy: {
            select: {
              policyName: true
            }
          }
        }
      },
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
              priority: true
            }
          }
        }
      }
    },
    orderBy: {
      controlMappings: {
        _count: 'desc'
      }
    },
    take: 50
  });

  console.log(`Analyzing top 50 settings with control mappings...\n`);

  let totalSettings = 0;
  let workingSettings = 0;
  let criticalWorking = 0;
  let highWorking = 0;

  console.log('='.repeat(80));
  console.log('EXTRACTION STATUS BY PRIORITY');
  console.log('='.repeat(80) + '\n');

  for (const setting of recentlyUpdated) {
    const totalChecks = setting.complianceChecks.length;
    const successfulChecks = setting.complianceChecks.filter(
      c => c.actualValue !== null && c.actualValue !== 'null'
    ).length;

    const extractionRate = totalChecks > 0 ? successfulChecks / totalChecks : 0;
    const isWorking = extractionRate >= 0.5;

    totalSettings++;
    if (isWorking) workingSettings++;

    // Check control priorities
    const hasCritical = setting.controlMappings.some(
      m => m.control.priority === 'Critical'
    );
    const hasHigh = setting.controlMappings.some(
      m => m.control.priority === 'High'
    );

    if (hasCritical && isWorking) criticalWorking++;
    if (hasHigh && isWorking) highWorking++;

    // Show status
    const status = extractionRate >= 0.8 ? '✅ Excellent' :
                   extractionRate >= 0.5 ? '✓ Good' :
                   extractionRate > 0 ? '⚠️ Partial' :
                   '❌ Failed';

    const priority = hasCritical ? 'CRITICAL' :
                     hasHigh ? 'HIGH' :
                     'MEDIUM';

    console.log(`${status} [${priority}] ${setting.displayName}`);
    console.log(`    Extraction: ${successfulChecks}/${totalChecks} (${(extractionRate * 100).toFixed(0)}%)`);
    console.log(`    Controls: ${setting.controlMappings.length} (${setting.controlMappings.map(m => m.control.controlId).slice(0, 3).join(', ')}...)`);
    console.log(`    Property: ${setting.settingName}`);
    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Total high-value settings analyzed: ${totalSettings}`);
  console.log(`Working (>50% extraction): ${workingSettings} (${((workingSettings / totalSettings) * 100).toFixed(0)}%)`);
  console.log(`Critical priority working: ${criticalWorking}`);
  console.log(`High priority working: ${highWorking}`);
  console.log('');

  // Control coverage
  const allControls = new Set<string>();
  const workingControls = new Set<string>();

  for (const setting of recentlyUpdated) {
    const extractionRate = setting.complianceChecks.length > 0
      ? setting.complianceChecks.filter(c => c.actualValue !== null).length / setting.complianceChecks.length
      : 0;

    for (const mapping of setting.controlMappings) {
      allControls.add(mapping.control.controlId);
      if (extractionRate >= 0.5) {
        workingControls.add(mapping.control.controlId);
      }
    }
  }

  console.log('='.repeat(80));
  console.log('CONTROL COVERAGE');
  console.log('='.repeat(80) + '\n');

  console.log(`Total unique controls in top 50: ${allControls.size}`);
  console.log(`Controls with working extractions: ${workingControls.size}`);
  console.log(`Coverage rate: ${((workingControls.size / allControls.size) * 100).toFixed(0)}%`);
  console.log('');

  // Recommendations
  console.log('='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  const failing = recentlyUpdated.filter(s => {
    const rate = s.complianceChecks.length > 0
      ? s.complianceChecks.filter(c => c.actualValue !== null).length / s.complianceChecks.length
      : 0;
    return rate < 0.5 && s.controlMappings.length > 3;
  });

  if (failing.length > 0) {
    console.log(`${failing.length} high-value settings still need attention:\n`);
    failing.slice(0, 10).forEach(s => {
      console.log(`  • ${s.displayName}`);
      console.log(`    Current property: ${s.settingName}`);
      console.log(`    Controls: ${s.controlMappings.length}`);
    });
    console.log('\nConsider additional research for these settings.');
  } else {
    console.log('✅ All high-value settings are working well!');
  }

  await prisma.$disconnect();
}

validateImprovements().catch(console.error);
```

Run it:
```bash
npx tsx src/scripts/validate-phase2-improvements.ts
```

---

## Alternative: Specialized Extractors

If you prefer a more technical approach instead of manual research, you can implement specialized extractors for specific policy types.

### Specialized Extractor for Settings Catalog

Settings Catalog policies are notoriously difficult because they use deeply nested structures with non-intuitive definition IDs.

📁 File: `server/src/services/settings-catalog-extractor.service.ts`

🔄 COMPLETE FILE:
```typescript
/**
 * Settings Catalog Specialized Extractor
 *
 * Handles the complex nested structure of Settings Catalog policies
 * (configurationPolicies with settingInstance arrays)
 */

export interface SettingsCatalogResult {
  definitionId: string;
  value: any;
  type: 'choice' | 'simple' | 'group' | 'collection';
}

/**
 * Extract all settings from a Settings Catalog policy
 */
export function extractSettingsCatalog(policyData: any): Map<string, SettingsCatalogResult> {
  const results = new Map<string, SettingsCatalogResult>();

  if (!policyData.settings || !Array.isArray(policyData.settings)) {
    return results;
  }

  for (const setting of policyData.settings) {
    if (setting['@odata.type'] !== '#microsoft.graph.deviceManagementConfigurationSetting') {
      continue;
    }

    const instance = setting.settingInstance;
    if (!instance) continue;

    const definitionId = instance.settingDefinitionId?.toLowerCase() || '';
    if (!definitionId) continue;

    // Extract based on setting type
    let value: any;
    let type: SettingsCatalogResult['type'];

    if (instance.choiceSettingValue) {
      value = instance.choiceSettingValue.value;
      type = 'choice';
    } else if (instance.simpleSettingValue) {
      value = instance.simpleSettingValue.value;
      type = 'simple';
    } else if (instance.groupSettingCollectionValue) {
      value = instance.groupSettingCollectionValue;
      type = 'collection';
    } else if (instance.groupSettingValue) {
      value = instance.groupSettingValue;
      type = 'group';
    } else {
      continue;
    }

    results.set(definitionId, { definitionId, value, type });
  }

  return results;
}

/**
 * Match a setting to Settings Catalog data using multiple strategies
 */
export function matchSettingsCatalog(
  setting: { displayName: string; settingName: string | null; settingPath: string },
  catalogData: Map<string, SettingsCatalogResult>
): SettingsCatalogResult | null {
  
  // Strategy 1: Exact match on settingPath
  if (setting.settingPath) {
    const match = catalogData.get(setting.settingPath.toLowerCase());
    if (match) return match;
  }

  // Strategy 2: Exact match on settingName
  if (setting.settingName) {
    const match = catalogData.get(setting.settingName.toLowerCase());
    if (match) return match;
  }

  // Strategy 3: Fuzzy match on display name
  // Extract key terms from display name
  const displayLower = setting.displayName.toLowerCase();
  const terms = displayLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3);

  // Find definition IDs that contain multiple terms
  for (const [definitionId, result] of catalogData.entries()) {
    let matchScore = 0;
    for (const term of terms) {
      if (definitionId.includes(term)) {
        matchScore++;
      }
    }

    // If definition ID contains most of the key terms, it's likely a match
    if (matchScore >= Math.min(terms.length * 0.6, 3)) {
      return result;
    }
  }

  return null;
}

/**
 * Integration with smart extractor
 * Add this as a new strategy in smart-extractor.service.ts
 */
export function createSettingsCatalogStrategy() {
  return {
    name: 'settings-catalog-specialized',
    priority: 10, // High priority for Settings Catalog policies
    description: 'Specialized extractor for Settings Catalog deep matching',
    extract: (policyData: any, setting: any) => {
      // Only run on Settings Catalog policies
      const isSettingsCatalog = 
        policyData.settings?.some((s: any) => 
          s['@odata.type'] === '#microsoft.graph.deviceManagementConfigurationSetting'
        );

      if (!isSettingsCatalog) {
        return null;
      }

      const catalogData = extractSettingsCatalog(policyData);
      const match = matchSettingsCatalog(setting, catalogData);

      if (match) {
        return {
          value: match.value,
          strategy: 'settings-catalog-specialized',
          confidence: 0.85,
          path: `[catalog: ${match.definitionId}]`
        };
      }

      return null;
    }
  };
}
```

To integrate this, add to `smart-extractor.service.ts`:

```typescript
import { createSettingsCatalogStrategy } from './settings-catalog-extractor.service.js';

// In SmartExtractor class:
private strategies: ExtractionStrategy[] = [
  exactPathStrategy,
  stripPrefixStrategy,
  directPropertyStrategy,
  camelCaseVariantsStrategy,
  shallowSearchStrategy,
  settingsCatalogStrategy,
  settingsCatalogDeepStrategy,
  abbreviationExpansionStrategy,
  synonymMatchingStrategy,
  createSettingsCatalogStrategy() // Add specialized extractor
];
```

---

## Success Criteria

### Phase 2 Targets

- [ ] 50 high-value settings researched
- [ ] Manual mappings applied successfully
- [ ] Match rate improved to 30-40%
- [ ] +15-25 additional unique controls covered
- [ ] Critical/High priority controls extraction >70%
- [ ] No false positives introduced

### Quality Checks

- [ ] All manual mappings verified with actual policies
- [ ] Property names match Graph API responses exactly
- [ ] Value types match expectations
- [ ] No accidentally broken existing mappings
- [ ] Documentation updated with findings

---

## Time Breakdown

| Task | Time | Notes |
|------|------|-------|
| Run identification script | 15 min | Automated |
| Setup research environment | 30 min | One-time setup |
| Research 50 settings | 3-4 hours | Main effort |
| Create bulk update script | 30 min | Using template |
| Apply & verify | 30 min | Testing |
| **Total** | **4-6 hours** | Can spread over days |

---

## Troubleshooting

### Issue: Can't find property in Graph API

**Symptom:** Setting exists in portal but not in Graph response

**Solutions:**
1. Try beta endpoint: `/beta/` instead of `/v1.0/`
2. Check if it's a Settings Catalog policy (different structure)
3. Verify you have correct policy ID
4. Check if setting is in a nested object

### Issue: Property name doesn't match any variation

**Symptom:** Found property but name is completely different

**This is normal!** Some examples:
- Display: "Require BitLocker" → Property: `deviceEncryptionEnabled`
- Display: "PIN Complexity" → Property: `pinMinimumLength`

**Solution:** Just use the actual property name you found.

### Issue: Multiple properties for one setting

**Symptom:** Setting seems to map to several properties

**Example:**
```
Display: "Password Policy"
Properties: passwordMinimumLength, passwordRequired, passwordComplexity
```

**Solution:** Pick the most relevant property, or create separate M365Setting entries for each property aspect.

---

## Next Steps: Phase 3

After Phase 2, you'll have:
- ✅ 30-40% match rate
- ✅ 50 high-value settings mapped
- ✅ Strong foundation for automation

**Phase 3 will implement:**
- Automatic learning system
- Self-updating settingName values
- Continuous improvement over time
- Monitoring dashboard

---

## Summary

### Phase 2 Achievements

✅ **Identified top 50 high-value settings**  
✅ **Manually researched actual property names**  
✅ **Applied verified mappings**  
✅ **Improved match rate by 15-20%**  
✅ **Covered 15-25 additional controls**  

### Files Created

- ➕ `server/src/scripts/identify-high-value-settings.ts`
- ➕ `server/src/scripts/apply-manual-mappings.ts`
- ➕ `server/src/scripts/validate-phase2-improvements.ts`
- ➕ `server/src/services/settings-catalog-extractor.service.ts` (optional)
- 📊 Database: M365Setting records updated

### Expected Outcome

**After Phase 2:**
- Match rate: 30-40%
- Extracted settings: 140-180/456
- Verified controls: 25-35
- High-priority control coverage: >70%

---

**Last Updated:** 2025-11-20  
**Phase:** 2 of 3 (Manual High-Value Targeting)  
**Status:** Ready for implementation  
**Estimated Duration:** 4-6 hours (can spread over multiple sessions)
