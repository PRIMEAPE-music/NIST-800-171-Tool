# Phase 5: Data Quality Fixes

## Overview

**Goal:** Audit and fix data quality issues in M365 settings templates to maximize policy matching accuracy

**Impact:** 
- Fixes 57+ settings with NULL or incorrect `policyTemplate` values
- Dramatically improves policy-to-setting matching accuracy
- Ensures compliance calculations are correct

**Priority:** CRITICAL - This is about DATA QUALITY, not adding new APIs

**Dependencies:** Should be done after Phases 1-4 (or at least understand which policies you have)

---

## Problem Statement

During implementation, several data quality issues were discovered:

### Issue 1: NULL Templates (57 settings)
57 settings have `policyTemplate: null`, meaning they can never match policies.

### Issue 2: Incorrect Template Assignments
Many settings have wrong `policyTemplate` values. Examples:

| Setting | Current Template | Should Be |
|---------|-----------------|-----------|
| AppLocker - Executable Rules | `#microsoft.graph.iosManagedAppProtection` | Windows-specific template |
| Enable Credential Guard | `#microsoft.graph.iosManagedAppProtection` | Windows security template |
| PowerShell Module Logging | `#microsoft.graph.iosManagedAppProtection` | Windows configuration |
| Defender Antivirus Settings | `#microsoft.graph.iosManagedAppProtection` | Defender/Intune template |

**Root Cause:** Settings were likely imported from a template system that made assumptions about policy types without validating against actual Microsoft Graph API schema.

---

## Prerequisites

### Required Tools
- Database access via Prisma
- Text editor for manual review
- Backup of current database state

### Create Database Backup

```bash
cd server

# Create backup
cp prisma/dev.db prisma/dev.db.backup.phase5

# Verify backup
ls -lh prisma/dev.db*
```

---

## Implementation Steps

### Step 1: Audit NULL Templates

**File:** `server/src/scripts/audit-null-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditNullTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT: SETTINGS WITH NULL TEMPLATES');
  console.log('='.repeat(70) + '\n');

  try {
    const nullTemplateSettings = await prisma.m365Setting.findMany({
      where: {
        policyTemplate: null,
      },
      orderBy: {
        category: 'asc',
      },
    });

    console.log(`Total settings with NULL templates: ${nullTemplateSettings.length}\n`);

    // Group by category
    const byCategory: { [key: string]: any[] } = {};
    nullTemplateSettings.forEach(setting => {
      const cat = setting.category || 'Unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(setting);
    });

    // Display grouped results
    for (const [category, settings] of Object.entries(byCategory)) {
      console.log(`\n${category} (${settings.length} settings):`);
      console.log('='.repeat(70));
      
      settings.forEach(setting => {
        console.log(`\nID: ${setting.id}`);
        console.log(`Setting: ${setting.settingName}`);
        console.log(`Description: ${setting.description?.substring(0, 100)}...`);
        console.log(`Registry/Path: ${setting.registryPath || setting.omaUri || 'N/A'}`);
        console.log(`Template Family: ${setting.templateFamily || 'N/A'}`);
      });
    }

    // Export to CSV for manual review
    const csvRows = nullTemplateSettings.map(s => 
      `${s.id},"${s.settingName}","${s.category}","${s.templateFamily}","${s.registryPath || s.omaUri}"`
    );
    
    const csv = ['ID,Setting Name,Category,Template Family,Registry/OMA-URI', ...csvRows].join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('null-templates-audit.csv', csv);
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Audit complete. Results exported to null-templates-audit.csv`);
    console.log('='.repeat(70));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

auditNullTemplates();
```

**Run the audit:**

```bash
cd server
npx tsx src/scripts/audit-null-templates.ts

# Review the CSV
cat null-templates-audit.csv
```

---

### Step 2: Audit Incorrect Templates

**File:** `server/src/scripts/audit-incorrect-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditIncorrectTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT: SETTINGS WITH POTENTIALLY INCORRECT TEMPLATES');
  console.log('='.repeat(70) + '\n');

  try {
    // Windows-specific settings with iOS templates
    console.log('🔍 Finding Windows settings with iOS templates...\n');
    
    const windowsWithiOS = await prisma.m365Setting.findMany({
      where: {
        AND: [
          {
            OR: [
              { settingName: { contains: 'Windows', mode: 'insensitive' } },
              { settingName: { contains: 'AppLocker', mode: 'insensitive' } },
              { settingName: { contains: 'PowerShell', mode: 'insensitive' } },
              { settingName: { contains: 'Credential Guard', mode: 'insensitive' } },
              { settingName: { contains: 'BitLocker', mode: 'insensitive' } },
              { registryPath: { not: null } },
            ],
          },
          {
            policyTemplate: {
              contains: 'ios',
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    console.log(`Found ${windowsWithiOS.length} Windows settings with iOS templates:\n`);
    
    windowsWithiOS.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`  Setting: ${s.settingName}`);
      console.log(`  Current Template: ${s.policyTemplate}`);
      console.log(`  Registry: ${s.registryPath || 'N/A'}`);
      console.log(`  Suggested: Windows-specific template (Intune/Settings Catalog)\n`);
    });

    // Defender settings with wrong templates
    console.log('\n🔍 Finding Defender settings with non-Defender templates...\n');
    
    const defenderMismatch = await prisma.m365Setting.findMany({
      where: {
        AND: [
          {
            OR: [
              { settingName: { contains: 'Defender', mode: 'insensitive' } },
              { settingName: { contains: 'Antivirus', mode: 'insensitive' } },
              { settingName: { contains: 'Microsoft Defender', mode: 'insensitive' } },
            ],
          },
          {
            policyTemplate: {
              not: {
                contains: 'defender',
              },
            },
          },
        ],
      },
    });

    console.log(`Found ${defenderMismatch.length} Defender settings with non-Defender templates:\n`);
    
    defenderMismatch.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`  Setting: ${s.settingName}`);
      console.log(`  Current Template: ${s.policyTemplate}`);
      console.log(`  Suggested: Defender ATP or Antivirus template\n`);
    });

    // Export results
    const allIssues = [...windowsWithiOS, ...defenderMismatch];
    const csvRows = allIssues.map(s => 
      `${s.id},"${s.settingName}","${s.policyTemplate}","${s.category}","Needs Review"`
    );
    
    const csv = ['ID,Setting Name,Current Template,Category,Issue'].concat(csvRows).join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('incorrect-templates-audit.csv', csv);
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Audit complete. Results exported to incorrect-templates-audit.csv`);
    console.log('='.repeat(70));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

auditIncorrectTemplates();
```

**Run the audit:**

```bash
cd server
npx tsx src/scripts/audit-incorrect-templates.ts
```

---

### Step 3: Create Template Fix Script

**File:** `server/src/scripts/fix-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Template Fix Mappings
 * 
 * Based on audit results, these are known incorrect template assignments
 * that need to be corrected.
 */
const TEMPLATE_FIXES: Array<{
  settingIds?: number[];
  settingNamePattern?: string;
  currentTemplate: string | null;
  correctTemplate: string;
  reason: string;
}> = [
  // Example fixes - YOU MUST CUSTOMIZE THIS based on your audit results
  {
    settingNamePattern: 'AppLocker',
    currentTemplate: '#microsoft.graph.iosManagedAppProtection',
    correctTemplate: '#microsoft.graph.windows10EndpointProtectionConfiguration',
    reason: 'AppLocker is Windows-specific, not iOS',
  },
  {
    settingNamePattern: 'Credential Guard',
    currentTemplate: '#microsoft.graph.iosManagedAppProtection',
    correctTemplate: '#microsoft.graph.windows10EndpointProtectionConfiguration',
    reason: 'Credential Guard is Windows security feature',
  },
  {
    settingNamePattern: 'PowerShell',
    currentTemplate: '#microsoft.graph.iosManagedAppProtection',
    correctTemplate: '#microsoft.graph.windows10CustomConfiguration',
    reason: 'PowerShell logging is Windows-specific',
  },
  // Add more fixes based on your audit
];

async function fixTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('FIXING TEMPLATE ASSIGNMENTS');
  console.log('='.repeat(70) + '\n');

  let totalFixed = 0;

  try {
    for (const fix of TEMPLATE_FIXES) {
      console.log(`\n📝 Applying fix: ${fix.reason}`);
      console.log(`   From: ${fix.currentTemplate}`);
      console.log(`   To:   ${fix.correctTemplate}\n`);

      let whereClause: any = {
        policyTemplate: fix.currentTemplate,
      };

      if (fix.settingNamePattern) {
        whereClause.settingName = {
          contains: fix.settingNamePattern,
          mode: 'insensitive',
        };
      }

      if (fix.settingIds) {
        whereClause.id = {
          in: fix.settingIds,
        };
      }

      const result = await prisma.m365Setting.updateMany({
        where: whereClause,
        data: {
          policyTemplate: fix.correctTemplate,
        },
      });

      console.log(`   ✅ Fixed ${result.count} settings`);
      totalFixed += result.count;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ FIXES COMPLETE: ${totalFixed} settings updated`);
    console.log('='.repeat(70));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixTemplates();
```

---

### Step 4: Manual Review Process

**IMPORTANT:** Don't run automated fixes without manual review!

**Recommended Process:**

1. **Run audits** to identify issues
2. **Review audit CSVs** to understand patterns
3. **Research correct templates** using Microsoft documentation
4. **Customize fix script** with specific corrections
5. **Test on backup database** first
6. **Run fixes** on production database
7. **Re-run validation** to verify improvements

**Example Manual Review:**

```bash
# Review NULL templates
cd server
npx tsx src/scripts/audit-null-templates.ts

# Open CSV in spreadsheet software
# For each setting:
#   1. Determine what Microsoft policy type it belongs to
#   2. Find the correct @odata.type from Microsoft docs
#   3. Add to TEMPLATE_FIXES array in fix-templates.ts

# Example: If "BitLocker Recovery" has null template:
#   - Research: BitLocker is managed via Intune Disk Encryption
#   - Correct template: #settingsCatalog.endpointSecurityDiskEncryption
#   - Add to fixes array
```

---

### Step 5: Assign Templates to NULL Settings

**Common NULL Template Categories and Recommended Assignments:**

| Category | Likely Template |
|----------|----------------|
| BitLocker settings | `#settingsCatalog.endpointSecurityDiskEncryption` |
| Firewall settings | `#settingsCatalog.endpointSecurityFirewall` |
| Authentication settings | `#microsoft.graph.conditionalAccessPolicy` |
| Azure AD settings | `#microsoft.graph.authorizationPolicy` |
| Audit settings | `#microsoft.graph.auditLogConfiguration` |
| Device Compliance | `#microsoft.graph.windows10CompliancePolicy` |

**Script Template for NULL Fixes:**

```typescript
// Add to fix-templates.ts TEMPLATE_FIXES array:

{
  settingIds: [123, 124, 125], // IDs from audit
  currentTemplate: null,
  correctTemplate: '#settingsCatalog.endpointSecurityDiskEncryption',
  reason: 'BitLocker settings belong to Disk Encryption policy',
},
```

---

## Testing & Validation

### Test 1: Before/After Comparison

```bash
cd server

# BEFORE fixes
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const nullCount = await prisma.m365Setting.count({
  where: { policyTemplate: null }
});

const withChecks = await prisma.m365Setting.count({
  where: { NOT: { complianceChecks: null } }
});

console.log('BEFORE FIXES:');
console.log(\`  NULL templates: \${nullCount}\`);
console.log(\`  With checks: \${withChecks}\`);

await prisma.\$disconnect();
"

# Run fixes
npx tsx src/scripts/fix-templates.ts

# AFTER fixes
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const nullCount = await prisma.m365Setting.count({
  where: { policyTemplate: null }
});

const withChecks = await prisma.m365Setting.count({
  where: { NOT: { complianceChecks: null } }
});

console.log('AFTER FIXES:');
console.log(\`  NULL templates: \${nullCount}\`);
console.log(\`  With checks: \${withChecks}\`);

await prisma.\$disconnect();
"
```

### Test 2: Re-run Validation

```bash
# Re-run compliance validation
npx tsx src/scripts/revalidate-all.ts

# Check unmatched settings
npx tsx src/scripts/check-unmatched-settings.ts
```

---

## Expected Outcomes

After Phase 5 completion:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| NULL templates | 57 | 0-10 | -47+ |
| Incorrect templates | 50+ | 0-5 | -45+ |
| Settings matched | 375 | 550+ | +175+ |
| Coverage percentage | 55% | 81%+ | +26%+ |

---

## Rollback Procedure

```bash
cd server

# Restore from backup
cp prisma/dev.db.backup.phase5 prisma/dev.db

# Restart server
npm run dev
```

---

## Common Template Assignments

**Reference guide for correct template assignments:**

### Intune Configuration
- Windows settings with registry paths: `#microsoft.graph.windows10GeneralConfiguration`
- Custom OMA-URI: `#microsoft.graph.windows10CustomConfiguration`
- iOS settings: `#microsoft.graph.iosGeneralDeviceConfiguration`
- Android settings: `#microsoft.graph.androidGeneralDeviceConfiguration`

### Settings Catalog (Modern)
- BitLocker: `#settingsCatalog.endpointSecurityDiskEncryption`
- Firewall: `#settingsCatalog.endpointSecurityFirewall`
- Antivirus: `#settingsCatalog.endpointSecurityAntivirus`
- EDR: `#settingsCatalog.endpointSecurityEndpointDetectionAndResponse`
- ASR: `#settingsCatalog.endpointSecurityAttackSurfaceReduction`
- Security Baselines: `#settingsCatalog.baseline`

### Azure AD
- Conditional Access: `#microsoft.graph.conditionalAccessPolicy`
- Authorization: `#microsoft.graph.authorizationPolicy`
- PIM: `#microsoft.graph.privilegedIdentityManagement`

### Microsoft Purview
- DLP: `#microsoft.graph.dataLossPreventionPolicy`
- Sensitivity Labels: `#microsoft.graph.sensitivityLabel`

### Defender
- ATP: `#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration`
- Attack Simulation: `#microsoft.graph.attackSimulationTraining`

---

## Critical Reminders

1. **ALWAYS backup database before running fixes**
2. **Review audit results manually** - don't blindly trust automation
3. **Test fixes incrementally** - fix one category at a time
4. **Verify with Microsoft docs** - ensure template names are correct
5. **Re-run validation** after each set of fixes

---

## Next Steps

After Phase 5:
1. **Proceed to Phase 6**: Final validation and documentation
2. **Monitor compliance metrics**: Should see dramatic improvement
3. **Create documentation**: Record your template assignment decisions

---

**End of Phase 5 Implementation Guide**
