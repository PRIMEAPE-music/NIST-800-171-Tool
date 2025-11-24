# Phase 1: Foundation - Database Schema Enhancement

## 📋 Overview

**What This Phase Does:**
- Adds tracking fields to understand which extraction strategies work
- Links settings to specific policy templates (e.g., "Windows Update Ring" vs "Compliance Policy")
- Stores learning data so the system gets smarter over time
- Prepares the database for smart extraction in Phase 3

**Time Estimate:** 2-3 hours

**Files Modified:**
- `prisma/schema.prisma`
- New migration file (auto-generated)
- `server/src/services/m365-sync.service.ts` (optional enhancement)

---

## 🎯 Step 1: Update Prisma Schema

### 📁 File: `prisma/schema.prisma`

**What We're Adding:**

1. **M365Setting enhancements** - Track which extraction strategies work
2. **M365Policy enhancements** - Store policy template for easy filtering
3. **Indexes** - Speed up template-based queries

### 🔍 FIND:
```prisma
model M365Setting {
  id                     Int                      @id @default(autoincrement())
  displayName            String
  policyType             String
  platform               String
  settingPath            String
  expectedValue          String?
  comparisonOperator     String                   @default("equals")
  category               String?
  description            String?
  isActive               Boolean                  @default(true)
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  complianceChecks       SettingComplianceCheck[]
  controlSettingMappings ControlSettingMapping[]
}
```

### ✏️ REPLACE WITH:
```prisma
model M365Setting {
  id                     Int                      @id @default(autoincrement())
  displayName            String
  policyType             String
  platform               String
  settingPath            String
  expectedValue          String?
  comparisonOperator     String                   @default("equals")
  category               String?
  description            String?
  isActive               Boolean                  @default(true)
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  
  // === NEW FIELDS FOR HYBRID APPROACH ===
  // Policy template this setting applies to
  policyTemplate         String?                  // e.g., "microsoft.graph.windowsUpdateForBusinessConfiguration"
  templateFamily         String?                  // e.g., "Update", "Compliance", "AppProtection"
  
  // Alternate paths to try during extraction
  pathVariants           String?                  // JSON array: ["path1", "path2", "path3"]
  
  // Extraction strategy hints for optimization
  extractionHints        String?                  // JSON: {"preferredStrategy": "strip-prefix", "notes": "..."}
  
  // Learning metrics - track extraction success over time
  successfulExtractions  Int                      @default(0)
  failedExtractions      Int                      @default(0)
  lastExtractedValue     String?                  // For debugging and verification
  lastExtractedAt        DateTime?
  lastSuccessfulStrategy String?                  // Which strategy worked last time
  
  // === EXISTING RELATIONS ===
  complianceChecks       SettingComplianceCheck[]
  controlSettingMappings ControlSettingMapping[]
  
  // === NEW INDEXES FOR PERFORMANCE ===
  @@index([policyTemplate])
  @@index([templateFamily])
  @@index([policyType, policyTemplate])
}
```

---

### 🔍 FIND:
```prisma
model M365Policy {
  id               Int                      @id @default(autoincrement())
  policyId         String                   @unique
  displayName      String
  policyType       String
  description      String?
  platform         String?
  rawData          String
  lastSyncedAt     DateTime                 @default(now())
  createdAt        DateTime                 @default(now())
  updatedAt        DateTime                 @updatedAt
  complianceChecks SettingComplianceCheck[]
}
```

### ✏️ REPLACE WITH:
```prisma
model M365Policy {
  id               Int                      @id @default(autoincrement())
  policyId         String                   @unique
  displayName      String
  policyType       String
  description      String?
  platform         String?
  rawData          String
  lastSyncedAt     DateTime                 @default(now())
  createdAt        DateTime                 @default(now())
  updatedAt        DateTime                 @updatedAt
  
  // === NEW FIELDS FOR HYBRID APPROACH ===
  // Extracted from rawData["@odata.type"] for easy filtering
  odataType        String?                  // e.g., "#microsoft.graph.windowsUpdateForBusinessConfiguration"
  
  // High-level grouping (derived from odataType)
  templateFamily   String?                  // e.g., "Update", "Compliance", "AppProtection", "Configuration"
  
  // Cache of all extractable properties (for quick lookups)
  extractedProperties String?               // JSON: {"automaticUpdateMode": "autoInstall", ...}
  propertiesLastExtracted DateTime?
  
  // === EXISTING RELATIONS ===
  complianceChecks SettingComplianceCheck[]
  
  // === NEW INDEXES FOR PERFORMANCE ===
  @@index([odataType])
  @@index([templateFamily])
  @@index([policyType, odataType])
}
```

---

## 🎯 Step 2: Create and Run Migration

### Run these commands in your terminal:

```bash
# Navigate to project root
cd /path/to/your/nist-compliance-app

# Generate migration
npx prisma migrate dev --name add_hybrid_extraction_fields

# This will:
# 1. Create a new migration file
# 2. Apply it to your SQLite database
# 3. Regenerate Prisma Client
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

SQLite database dev.db created at file:./dev.db

Applying migration `20241118_add_hybrid_extraction_fields`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20241118_add_hybrid_extraction_fields/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

### ⚠️ Troubleshooting Migration Issues

**If you see errors about existing data:**

The migration might fail if you have existing policies/settings and SQLite can't add new NOT NULL fields. Our fields are all nullable, so this shouldn't happen, but if it does:

```bash
# Reset database (WARNING: Loses all data)
npx prisma migrate reset

# Or manually add default values in the migration file
```

**If migration hangs:**
```bash
# Cancel with Ctrl+C
# Delete the failed migration folder
rm -rf prisma/migrations/[failed_migration_name]

# Try again
npx prisma migrate dev --name add_hybrid_extraction_fields
```

---

## 🎯 Step 3: Populate Policy OData Types

Now we'll extract the `@odata.type` from existing policies and populate the new `odataType` field.

### 📁 Create New File: `server/src/scripts/populate-policy-templates.ts`

```typescript
/**
 * Phase 1 - Step 3: Populate Policy Template Data
 * 
 * This script extracts @odata.type from existing M365Policy rawData
 * and populates the odataType and templateFamily fields.
 * 
 * Run with: npx tsx server/src/scripts/populate-policy-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PolicyTemplateMapping {
  odataType: string;
  family: string;
  keywords: string[];
}

// Template families based on Microsoft Graph API types
const TEMPLATE_MAPPINGS: PolicyTemplateMapping[] = [
  // === WINDOWS UPDATE / SERVICING ===
  {
    odataType: '#microsoft.graph.windowsUpdateForBusinessConfiguration',
    family: 'Update',
    keywords: ['update', 'servicing', 'ring']
  },
  
  // === COMPLIANCE POLICIES ===
  {
    odataType: '#microsoft.graph.windows10CompliancePolicy',
    family: 'Compliance',
    keywords: ['compliance', 'windows10']
  },
  {
    odataType: '#microsoft.graph.androidCompliancePolicy',
    family: 'Compliance',
    keywords: ['compliance', 'android']
  },
  {
    odataType: '#microsoft.graph.iosCompliancePolicy',
    family: 'Compliance',
    keywords: ['compliance', 'ios']
  },
  {
    odataType: '#microsoft.graph.macOSCompliancePolicy',
    family: 'Compliance',
    keywords: ['compliance', 'macos']
  },
  
  // === APP PROTECTION POLICIES ===
  {
    odataType: '#microsoft.graph.iosManagedAppProtection',
    family: 'AppProtection',
    keywords: ['app protection', 'ios', 'mam']
  },
  {
    odataType: '#microsoft.graph.androidManagedAppProtection',
    family: 'AppProtection',
    keywords: ['app protection', 'android', 'mam']
  },
  {
    odataType: '#microsoft.graph.windowsManagedAppProtection',
    family: 'AppProtection',
    keywords: ['app protection', 'windows', 'mam']
  },
  {
    odataType: '#microsoft.graph.mdmWindowsInformationProtectionPolicy',
    family: 'AppProtection',
    keywords: ['wip', 'information protection']
  },
  
  // === DEVICE CONFIGURATION ===
  {
    odataType: '#microsoft.graph.windows10CustomConfiguration',
    family: 'Configuration',
    keywords: ['configuration', 'custom', 'windows']
  },
  {
    odataType: '#microsoft.graph.windows10EndpointProtectionConfiguration',
    family: 'Configuration',
    keywords: ['endpoint protection', 'defender', 'firewall']
  },
  {
    odataType: '#microsoft.graph.windows10GeneralConfiguration',
    family: 'Configuration',
    keywords: ['general configuration', 'settings']
  },
  {
    odataType: '#microsoft.graph.iosGeneralDeviceConfiguration',
    family: 'Configuration',
    keywords: ['ios', 'device configuration']
  },
  {
    odataType: '#microsoft.graph.androidGeneralDeviceConfiguration',
    family: 'Configuration',
    keywords: ['android', 'device configuration']
  },
  
  // === AZURE AD / CONDITIONAL ACCESS ===
  {
    odataType: '#microsoft.graph.conditionalAccessPolicy',
    family: 'ConditionalAccess',
    keywords: ['conditional access', 'ca']
  },
  
  // === PURVIEW / COMPLIANCE ===
  {
    odataType: '#microsoft.graph.dataLossPreventionPolicy',
    family: 'Purview',
    keywords: ['dlp', 'data loss prevention']
  },
  {
    odataType: '#microsoft.graph.sensitivityLabel',
    family: 'Purview',
    keywords: ['sensitivity', 'label', 'classification']
  },
  {
    odataType: '#microsoft.graph.retentionPolicy',
    family: 'Purview',
    keywords: ['retention', 'lifecycle']
  }
];

async function populatePolicyTemplates() {
  console.log('🚀 Starting policy template population...\n');
  
  try {
    // Get all policies
    const policies = await prisma.m365Policy.findMany();
    console.log(`📊 Found ${policies.length} policies to process\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const templateStats: Record<string, number> = {};
    const familyStats: Record<string, number> = {};
    
    for (const policy of policies) {
      try {
        // Parse rawData to extract @odata.type
        const policyData = JSON.parse(policy.rawData);
        const odataType = policyData['@odata.type'];
        
        if (!odataType) {
          console.log(`⚠️  No @odata.type found for policy: ${policy.displayName}`);
          skipped++;
          continue;
        }
        
        // Find matching template family
        const mapping = TEMPLATE_MAPPINGS.find(m => m.odataType === odataType);
        const templateFamily = mapping?.family || 'Unknown';
        
        // Update policy with extracted data
        await prisma.m365Policy.update({
          where: { id: policy.id },
          data: {
            odataType,
            templateFamily
          }
        });
        
        // Track stats
        templateStats[odataType] = (templateStats[odataType] || 0) + 1;
        familyStats[templateFamily] = (familyStats[templateFamily] || 0) + 1;
        
        console.log(`✅ Updated: ${policy.displayName}`);
        console.log(`   Type: ${odataType}`);
        console.log(`   Family: ${templateFamily}\n`);
        
        updated++;
        
      } catch (error) {
        console.error(`❌ Error processing policy ${policy.displayName}:`, error);
        errors++;
      }
    }
    
    // Summary Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`⚠️  Skipped (no @odata.type): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Total processed: ${policies.length}\n`);
    
    // Template Distribution
    console.log('📋 TEMPLATE DISTRIBUTION:');
    console.log('-'.repeat(60));
    for (const [template, count] of Object.entries(templateStats).sort((a, b) => b[1] - a[1])) {
      console.log(`${count.toString().padStart(3)} × ${template}`);
    }
    
    console.log('\n🏷️  FAMILY DISTRIBUTION:');
    console.log('-'.repeat(60));
    for (const [family, count] of Object.entries(familyStats).sort((a, b) => b[1] - a[1])) {
      console.log(`${count.toString().padStart(3)} × ${family}`);
    }
    
    console.log('\n✅ Policy template population complete!\n');
    
  } catch (error) {
    console.error('❌ Fatal error during population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populatePolicyTemplates()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
```

### Run the Population Script:

```bash
npx tsx server/src/scripts/populate-policy-templates.ts
```

**Expected Output:**
```
🚀 Starting policy template population...

📊 Found 21 policies to process

✅ Updated: Windows Update Ring - Standard Users
   Type: #microsoft.graph.windowsUpdateForBusinessConfiguration
   Family: Update

✅ Updated: Windows 10 Compliance Policy
   Type: #microsoft.graph.windows10CompliancePolicy
   Family: Compliance

... (19 more policies)

============================================================
📊 POPULATION SUMMARY
============================================================
✅ Successfully updated: 21
⚠️  Skipped (no @odata.type): 0
❌ Errors: 0
📈 Total processed: 21

📋 TEMPLATE DISTRIBUTION:
------------------------------------------------------------
 10 × #microsoft.graph.windows10CompliancePolicy
  3 × #microsoft.graph.windowsUpdateForBusinessConfiguration
  2 × #microsoft.graph.iosManagedAppProtection
  2 × #microsoft.graph.androidManagedAppProtection
  1 × #microsoft.graph.conditionalAccessPolicy
  1 × #microsoft.graph.windows10EndpointProtectionConfiguration
  1 × #microsoft.graph.dataLossPreventionPolicy
  1 × #microsoft.graph.sensitivityLabel

🏷️  FAMILY DISTRIBUTION:
------------------------------------------------------------
 10 × Compliance
  4 × AppProtection
  3 × Update
  2 × Configuration
  1 × ConditionalAccess
  1 × Purview

✅ Policy template population complete!
```

---

## 🎯 Step 4: Verify Database Changes

### Check that new fields are populated:

```bash
# Open SQLite database
sqlite3 prisma/dev.db

# Check M365Policy table
SELECT id, displayName, odataType, templateFamily 
FROM M365Policy 
LIMIT 5;

# Check M365Setting table (new fields should be NULL for now)
SELECT id, displayName, policyTemplate, templateFamily, successfulExtractions 
FROM M365Setting 
LIMIT 5;

# Exit SQLite
.exit
```

**Expected Results:**

**M365Policy:**
```
1|Windows Update Ring - Standard Users|#microsoft.graph.windowsUpdateForBusinessConfiguration|Update
2|Windows 10 Compliance|#microsoft.graph.windows10CompliancePolicy|Compliance
3|iOS App Protection|#microsoft.graph.iosManagedAppProtection|AppProtection
...
```

**M365Setting:**
```
1|Windows Update - Automatic Mode|||0
2|Compliance - Password Required|||0
3|App Protection - Data Transfer|||0
...
```

(All new fields should be NULL/0 - we'll populate them in Phase 2)

---

## 🎯 Step 5: Optional - Add Helper Service

This utility will make it easier to work with templates in your code.

### 📁 Create New File: `server/src/services/template-helper.service.ts`

```typescript
/**
 * Template Helper Service
 * 
 * Utilities for working with policy templates and families
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TemplateFamilyInfo {
  family: string;
  templates: string[];
  description: string;
  settingCount?: number;
  policyCount?: number;
}

export const TEMPLATE_FAMILIES: Record<string, TemplateFamilyInfo> = {
  Update: {
    family: 'Update',
    templates: [
      '#microsoft.graph.windowsUpdateForBusinessConfiguration'
    ],
    description: 'Windows Update and servicing policies'
  },
  Compliance: {
    family: 'Compliance',
    templates: [
      '#microsoft.graph.windows10CompliancePolicy',
      '#microsoft.graph.androidCompliancePolicy',
      '#microsoft.graph.iosCompliancePolicy',
      '#microsoft.graph.macOSCompliancePolicy'
    ],
    description: 'Device compliance policies for various platforms'
  },
  AppProtection: {
    family: 'AppProtection',
    templates: [
      '#microsoft.graph.iosManagedAppProtection',
      '#microsoft.graph.androidManagedAppProtection',
      '#microsoft.graph.windowsManagedAppProtection',
      '#microsoft.graph.mdmWindowsInformationProtectionPolicy'
    ],
    description: 'Mobile Application Management (MAM) and data protection'
  },
  Configuration: {
    family: 'Configuration',
    templates: [
      '#microsoft.graph.windows10CustomConfiguration',
      '#microsoft.graph.windows10EndpointProtectionConfiguration',
      '#microsoft.graph.windows10GeneralConfiguration',
      '#microsoft.graph.iosGeneralDeviceConfiguration',
      '#microsoft.graph.androidGeneralDeviceConfiguration'
    ],
    description: 'Device configuration profiles'
  },
  ConditionalAccess: {
    family: 'ConditionalAccess',
    templates: [
      '#microsoft.graph.conditionalAccessPolicy'
    ],
    description: 'Azure AD Conditional Access policies'
  },
  Purview: {
    family: 'Purview',
    templates: [
      '#microsoft.graph.dataLossPreventionPolicy',
      '#microsoft.graph.sensitivityLabel',
      '#microsoft.graph.retentionPolicy'
    ],
    description: 'Microsoft Purview compliance policies'
  }
};

/**
 * Get template family for a given @odata.type
 */
export function getTemplateFamilyForType(odataType: string): string {
  for (const [family, info] of Object.entries(TEMPLATE_FAMILIES)) {
    if (info.templates.includes(odataType)) {
      return family;
    }
  }
  return 'Unknown';
}

/**
 * Get all templates for a family
 */
export function getTemplatesForFamily(family: string): string[] {
  return TEMPLATE_FAMILIES[family]?.templates || [];
}

/**
 * Get statistics about template distribution
 */
export async function getTemplateStatistics() {
  const stats = await prisma.$queryRaw<Array<{
    templateFamily: string;
    policy_count: number;
    setting_count: number;
  }>>`
    SELECT 
      COALESCE(p.templateFamily, 'Unknown') as templateFamily,
      COUNT(DISTINCT p.id) as policy_count,
      COUNT(DISTINCT s.id) as setting_count
    FROM M365Policy p
    LEFT JOIN M365Setting s ON s.templateFamily = p.templateFamily
    GROUP BY p.templateFamily
    ORDER BY policy_count DESC
  `;
  
  return stats;
}

/**
 * Get policies by template family
 */
export async function getPoliciesByFamily(family: string) {
  return prisma.m365Policy.findMany({
    where: { templateFamily: family },
    select: {
      id: true,
      displayName: true,
      odataType: true,
      platform: true,
      lastSyncedAt: true
    }
  });
}

/**
 * Check if a policy template is supported
 */
export function isTemplateSupported(odataType: string): boolean {
  return Object.values(TEMPLATE_FAMILIES)
    .some(info => info.templates.includes(odataType));
}
```

---

## ✅ Verification Checklist

Run through these checks to ensure Phase 1 is complete:

### **1. Database Schema**
```bash
# Check that migration applied successfully
npx prisma migrate status
```
Should show: `Database schema is up to date!`

### **2. Policy Data**
```bash
# Check that policies have odataType populated
npx prisma studio
```
- Navigate to `M365Policy` model
- Verify `odataType` and `templateFamily` fields are populated
- Should see values like `#microsoft.graph.windowsUpdateForBusinessConfiguration`

### **3. Setting Fields**
In Prisma Studio:
- Navigate to `M365Setting` model
- Verify new fields exist: `policyTemplate`, `templateFamily`, `successfulExtractions`, etc.
- Values should be NULL/0 for now (populated in Phase 2)

### **4. Test Query**
Create a quick test to verify template filtering works:

```typescript
// Test in your backend or via Prisma Studio console
const updatePolicies = await prisma.m365Policy.findMany({
  where: { templateFamily: 'Update' }
});
console.log(`Found ${updatePolicies.length} Update policies`);

const compliancePolicies = await prisma.m365Policy.findMany({
  where: { templateFamily: 'Compliance' }
});
console.log(`Found ${compliancePolicies.length} Compliance policies`);
```

---

## 📊 Before/After Comparison

### **Before Phase 1:**
```typescript
// M365Policy model
{
  id: 1,
  displayName: "Windows Update Ring",
  policyType: "Intune",
  rawData: '{"@odata.type": "#microsoft.graph.windowsUpdateForBusinessConfiguration", ...}'
  // No way to filter by template type easily
}

// M365Setting model  
{
  id: 1,
  displayName: "Automatic Update Mode",
  settingPath: "automaticUpdateMode"
  // No tracking of which policies this applies to
  // No tracking of extraction success
}
```

### **After Phase 1:**
```typescript
// M365Policy model
{
  id: 1,
  displayName: "Windows Update Ring",
  policyType: "Intune",
  rawData: '{"@odata.type": "#microsoft.graph.windowsUpdateForBusinessConfiguration", ...}',
  odataType: "#microsoft.graph.windowsUpdateForBusinessConfiguration", // ✅ NEW
  templateFamily: "Update" // ✅ NEW - Easy filtering!
}

// M365Setting model
{
  id: 1,
  displayName: "Automatic Update Mode",
  settingPath: "automaticUpdateMode",
  policyTemplate: null, // Will populate in Phase 2
  templateFamily: null,
  successfulExtractions: 0, // ✅ NEW - Learning metrics
  failedExtractions: 0,
  lastSuccessfulStrategy: null
}
```

---

## 🚨 Troubleshooting

### **Issue: Migration fails with "column already exists"**
```bash
# Check current schema state
npx prisma db pull

# Compare with your schema.prisma
# If they match, mark migration as applied
npx prisma migrate resolve --applied 20241118_add_hybrid_extraction_fields
```

### **Issue: Population script finds no @odata.type**
This means your `rawData` might not have the expected structure. Check a sample:
```typescript
const policy = await prisma.m365Policy.findFirst();
console.log(JSON.parse(policy.rawData));
```

Look for the `@odata.type` field. If it's missing or named differently, adjust the population script.

### **Issue: All policies show templateFamily: "Unknown"**
Your policy types don't match the mappings in `TEMPLATE_MAPPINGS`. Add your specific types:
```typescript
{
  odataType: '#your.specific.type.here',
  family: 'YourFamily',
  keywords: ['your', 'keywords']
}
```

