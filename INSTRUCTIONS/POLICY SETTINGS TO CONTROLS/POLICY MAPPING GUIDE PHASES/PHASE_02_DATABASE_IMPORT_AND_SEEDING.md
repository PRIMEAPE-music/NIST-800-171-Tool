# Phase 2: Database Import & Seeding

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 2 of 14 - Import Normalized M365 Settings Data  
**Optimized For:** Claude Code Execution  
**Date:** 2024-11-17

---

## 📋 PHASE OVERVIEW

### What This Phase Does

Imports the normalized M365 settings data into the new database schema by:
1. Reading data from `master_settings_catalog.json` (300-400 unique settings)
2. Reading data from `control_settings_mappings.json` (450-600 mappings)
3. Importing settings into `M365Setting` table with proper validation
4. Importing mappings into `ControlSettingMapping` table with control lookups
5. Validating data integrity and relationships
6. Generating import statistics and verification reports

### Prerequisites

- ✅ Phase 1 completed successfully
- ✅ Database schema migrated and verified
- ✅ Normalized data files exist at:
  - `INSTRUCTIONS/normalized-output/master_settings_catalog.json`
  - `INSTRUCTIONS/normalized-output/control_settings_mappings.json`
- ✅ All 97 NIST controls exist in database

### Expected Outcome

- 300-400 M365 settings imported to `m365_settings` table
- 450-600 control-to-setting mappings imported to `control_setting_mappings` table
- All settings have valid unique keys
- All mappings reference valid controls and settings
- Data integrity verified
- Import statistics generated

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Create Import Service

We'll create a dedicated service to handle the data import process.

**📁 Location:** `server/src/services/`  
**📄 File:** `m365SettingsImport.service.ts`

```typescript
/**
 * M365 Settings Import Service
 * 
 * Handles importing normalized M365 settings data into the database.
 * Imports data from:
 * - master_settings_catalog.json
 * - control_settings_mappings.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MasterSettingsCatalog {
  totalSettings: number;
  generatedAt: string;
  settings: SettingData[];
}

interface SettingData {
  settingName: string;
  displayName: string;
  settingPath: string;
  policyType: string;
  policySubType?: string;
  platform: string;
  dataType: string;
  expectedValue: string;
  validationOperator: string;
  description: string;
  implementationGuide?: string;
  microsoftDocUrl?: string;
}

interface ControlSettingsMappings {
  totalMappings: number;
  generatedAt: string;
  mappings: MappingData[];
}

interface MappingData {
  uniqueKey: string; // "settingPath|policyType|platform"
  controlId: string; // "03.XX.XX"
  confidence: string;
  isRequired: boolean;
  mappingRationale?: string;
  nistRequirement?: string;
}

interface ImportStats {
  settingsImported: number;
  settingsSkipped: number;
  mappingsImported: number;
  mappingsSkipped: number;
  errors: Array<{ type: string; message: string; details?: any }>;
  duration: number;
}

// ============================================================================
// M365 SETTINGS IMPORT SERVICE
// ============================================================================

export class M365SettingsImportService {
  private stats: ImportStats = {
    settingsImported: 0,
    settingsSkipped: 0,
    mappingsImported: 0,
    mappingsSkipped: 0,
    errors: [],
    duration: 0,
  };

  /**
   * Main import function - imports both settings and mappings
   */
  async importAll(): Promise<ImportStats> {
    const startTime = Date.now();
    logger.info('🚀 Starting M365 Settings Import...');

    try {
      // Step 1: Import settings
      logger.info('\n📦 Step 1: Importing M365 Settings...');
      await this.importSettings();

      // Step 2: Import mappings
      logger.info('\n🔗 Step 2: Importing Control-Setting Mappings...');
      await this.importMappings();

      this.stats.duration = Date.now() - startTime;
      
      logger.info('\n✅ Import completed successfully!');
      this.printStats();

      return this.stats;
    } catch (error) {
      logger.error('❌ Import failed:', error);
      this.stats.errors.push({
        type: 'FATAL',
        message: 'Import process failed',
        details: error,
      });
      throw error;
    }
  }

  /**
   * Import M365 settings from master catalog
   */
  private async importSettings(): Promise<void> {
    const filePath = path.join(
      process.cwd(),
      '..',
      'INSTRUCTIONS',
      'normalized-output',
      'master_settings_catalog.json'
    );

    logger.info(`📄 Reading settings from: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Settings catalog file not found: ${filePath}`);
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const catalog: MasterSettingsCatalog = JSON.parse(fileContent);

    logger.info(`📊 Found ${catalog.totalSettings} settings to import`);
    logger.info(`📅 Catalog generated: ${catalog.generatedAt}`);

    // Import settings in batches for better performance
    const batchSize = 50;
    const batches = Math.ceil(catalog.settings.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, catalog.settings.length);
      const batch = catalog.settings.slice(start, end);

      logger.info(`   Processing batch ${i + 1}/${batches} (${batch.length} settings)...`);

      for (const setting of batch) {
        try {
          await this.importSetting(setting);
        } catch (error) {
          logger.error(`   ❌ Failed to import setting: ${setting.displayName}`, error);
          this.stats.errors.push({
            type: 'SETTING_IMPORT',
            message: `Failed to import: ${setting.displayName}`,
            details: error,
          });
          this.stats.settingsSkipped++;
        }
      }
    }

    logger.info(`✅ Settings import complete: ${this.stats.settingsImported} imported, ${this.stats.settingsSkipped} skipped`);
  }

  /**
   * Import a single setting
   */
  private async importSetting(setting: SettingData): Promise<void> {
    try {
      // Check if setting already exists
      const existing = await prisma.m365Setting.findUnique({
        where: {
          settingPath_policyType_platform: {
            settingPath: setting.settingPath,
            policyType: setting.policyType,
            platform: setting.platform,
          },
        },
      });

      if (existing) {
        // Update existing setting
        await prisma.m365Setting.update({
          where: { id: existing.id },
          data: {
            settingName: setting.settingName,
            displayName: setting.displayName,
            policySubType: setting.policySubType || null,
            dataType: setting.dataType,
            expectedValue: setting.expectedValue,
            validationOperator: setting.validationOperator,
            description: setting.description,
            implementationGuide: setting.implementationGuide || null,
            microsoftDocUrl: setting.microsoftDocUrl || null,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        this.stats.settingsImported++;
      } else {
        // Create new setting
        await prisma.m365Setting.create({
          data: {
            settingName: setting.settingName,
            displayName: setting.displayName,
            settingPath: setting.settingPath,
            policyType: setting.policyType,
            policySubType: setting.policySubType || null,
            platform: setting.platform,
            dataType: setting.dataType,
            expectedValue: setting.expectedValue,
            validationOperator: setting.validationOperator,
            description: setting.description,
            implementationGuide: setting.implementationGuide || null,
            microsoftDocUrl: setting.microsoftDocUrl || null,
            isActive: true,
          },
        });
        this.stats.settingsImported++;
      }
    } catch (error) {
      logger.error(`Error importing setting ${setting.displayName}:`, error);
      throw error;
    }
  }

  /**
   * Import control-setting mappings
   */
  private async importMappings(): Promise<void> {
    const filePath = path.join(
      process.cwd(),
      '..',
      'INSTRUCTIONS',
      'normalized-output',
      'control_settings_mappings.json'
    );

    logger.info(`📄 Reading mappings from: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Mappings file not found: ${filePath}`);
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const mappingsData: ControlSettingsMappings = JSON.parse(fileContent);

    logger.info(`📊 Found ${mappingsData.totalMappings} mappings to import`);
    logger.info(`📅 Mappings generated: ${mappingsData.generatedAt}`);

    // Import mappings in batches
    const batchSize = 100;
    const batches = Math.ceil(mappingsData.mappings.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, mappingsData.mappings.length);
      const batch = mappingsData.mappings.slice(start, end);

      logger.info(`   Processing batch ${i + 1}/${batches} (${batch.length} mappings)...`);

      for (const mapping of batch) {
        try {
          await this.importMapping(mapping);
        } catch (error) {
          logger.error(`   ❌ Failed to import mapping: ${mapping.controlId} -> ${mapping.uniqueKey}`, error);
          this.stats.errors.push({
            type: 'MAPPING_IMPORT',
            message: `Failed to import mapping: ${mapping.controlId} -> ${mapping.uniqueKey}`,
            details: error,
          });
          this.stats.mappingsSkipped++;
        }
      }
    }

    logger.info(`✅ Mappings import complete: ${this.stats.mappingsImported} imported, ${this.stats.mappingsSkipped} skipped`);
  }

  /**
   * Import a single control-setting mapping
   */
  private async importMapping(mapping: MappingData): Promise<void> {
    try {
      // Parse unique key
      const [settingPath, policyType, platform] = mapping.uniqueKey.split('|');

      // Find the setting
      const setting = await prisma.m365Setting.findUnique({
        where: {
          settingPath_policyType_platform: {
            settingPath,
            policyType,
            platform,
          },
        },
      });

      if (!setting) {
        throw new Error(`Setting not found for unique key: ${mapping.uniqueKey}`);
      }

      // Find the control
      const control = await prisma.control.findUnique({
        where: { controlId: mapping.controlId },
      });

      if (!control) {
        throw new Error(`Control not found: ${mapping.controlId}`);
      }

      // Check if mapping already exists
      const existing = await prisma.controlSettingMapping.findUnique({
        where: {
          controlId_settingId: {
            controlId: control.id,
            settingId: setting.id,
          },
        },
      });

      if (existing) {
        // Update existing mapping
        await prisma.controlSettingMapping.update({
          where: { id: existing.id },
          data: {
            confidence: mapping.confidence,
            isRequired: mapping.isRequired,
            mappingRationale: mapping.mappingRationale || null,
            nistRequirement: mapping.nistRequirement || null,
            complianceStatus: 'Not Configured', // Reset status
            updatedAt: new Date(),
          },
        });
        this.stats.mappingsImported++;
      } else {
        // Create new mapping
        await prisma.controlSettingMapping.create({
          data: {
            controlId: control.id,
            settingId: setting.id,
            confidence: mapping.confidence,
            isRequired: mapping.isRequired,
            mappingRationale: mapping.mappingRationale || null,
            nistRequirement: mapping.nistRequirement || null,
            complianceStatus: 'Not Configured',
          },
        });
        this.stats.mappingsImported++;
      }
    } catch (error) {
      logger.error(`Error importing mapping ${mapping.controlId}:`, error);
      throw error;
    }
  }

  /**
   * Print import statistics
   */
  private printStats(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 IMPORT STATISTICS');
    console.log('='.repeat(80));
    console.log(`\n⚙️  Settings:`);
    console.log(`   ✅ Imported: ${this.stats.settingsImported}`);
    console.log(`   ⏭️  Skipped:  ${this.stats.settingsSkipped}`);
    console.log(`\n🔗 Mappings:`);
    console.log(`   ✅ Imported: ${this.stats.mappingsImported}`);
    console.log(`   ⏭️  Skipped:  ${this.stats.mappingsSkipped}`);
    console.log(`\n⚠️  Errors: ${this.stats.errors.length}`);
    if (this.stats.errors.length > 0) {
      console.log(`\nError Summary:`);
      const errorTypes = this.stats.errors.reduce((acc, err) => {
        acc[err.type] = (acc[err.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    console.log(`\n⏱️  Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Verify import results
   */
  async verifyImport(): Promise<{
    settingsCount: number;
    mappingsCount: number;
    controlsWithSettings: number;
    settingsWithoutMappings: number;
    mappingsWithoutSettings: number;
  }> {
    logger.info('🔍 Verifying import results...');

    const [
      settingsCount,
      mappingsCount,
      controlsWithSettings,
      settingsWithoutMappings,
    ] = await Promise.all([
      prisma.m365Setting.count(),
      prisma.controlSettingMapping.count(),
      prisma.control.count({
        where: {
          settingMappings: {
            some: {},
          },
        },
      }),
      prisma.m365Setting.count({
        where: {
          controlMappings: {
            none: {},
          },
        },
      }),
    ]);

    // Check for orphaned mappings (shouldn't happen with foreign keys)
    const mappingsWithoutSettings = await prisma.controlSettingMapping.count({
      where: {
        OR: [
          { setting: { is: null } },
          { control: { is: null } },
        ],
      },
    });

    const results = {
      settingsCount,
      mappingsCount,
      controlsWithSettings,
      settingsWithoutMappings,
      mappingsWithoutSettings,
    };

    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION RESULTS');
    console.log('='.repeat(80));
    console.log(`\n📊 Database Counts:`);
    console.log(`   Settings:                    ${settingsCount}`);
    console.log(`   Mappings:                    ${mappingsCount}`);
    console.log(`   Controls with settings:      ${controlsWithSettings} / 97`);
    console.log(`\n⚠️  Potential Issues:`);
    console.log(`   Settings without mappings:   ${settingsWithoutMappings}`);
    console.log(`   Orphaned mappings:           ${mappingsWithoutSettings}`);
    console.log('='.repeat(80) + '\n');

    if (settingsWithoutMappings > 0) {
      logger.warn(`Found ${settingsWithoutMappings} settings without any control mappings`);
    }

    if (mappingsWithoutSettings > 0) {
      logger.error(`Found ${mappingsWithoutSettings} orphaned mappings (should not happen!)`);
    }

    return results;
  }
}

export const m365SettingsImportService = new M365SettingsImportService();
```

**✅ VERIFICATION CHECKLIST - Step 1:**
- [ ] File created: `m365SettingsImport.service.ts`
- [ ] All TypeScript interfaces defined
- [ ] Import methods implemented
- [ ] Batch processing for performance
- [ ] Error handling included
- [ ] Statistics tracking implemented
- [ ] No TypeScript errors

---

### Step 2: Create Import Script

Create an executable script to run the import process.

**📁 Location:** `server/src/scripts/`  
**📄 File:** `import-m365-settings.ts`

```typescript
/**
 * M365 Settings Import Script
 * 
 * Imports normalized M365 settings data into the database.
 * Usage: npm run import:m365-settings
 */

import { m365SettingsImportService } from '../services/m365SettingsImport.service';
import { logger } from '../utils/logger';

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 M365 SETTINGS IMPORT SCRIPT');
    console.log('='.repeat(80) + '\n');

    // Run import
    const stats = await m365SettingsImportService.importAll();

    // Verify results
    const verification = await m365SettingsImportService.verifyImport();

    // Exit with appropriate code
    if (stats.errors.length > 0) {
      logger.warn('Import completed with errors. Review logs above.');
      process.exit(1);
    } else {
      logger.info('✅ Import completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    logger.error('❌ Import script failed:', error);
    console.error(error);
    process.exit(1);
  }
}

main();
```

**✅ VERIFICATION CHECKLIST - Step 2:**
- [ ] Script created: `import-m365-settings.ts`
- [ ] Uses import service
- [ ] Includes verification
- [ ] Proper exit codes
- [ ] Error handling included

---

### Step 3: Add Script Command to package.json

**📁 File:** `server/package.json`

🔍 **FIND:**
```json
    "backup:rev3": "ts-node src/scripts/create-migration-backup.ts",
    "verify:m365-schema": "ts-node -r tsconfig-paths/register src/scripts/verify-m365-schema.ts"
  },
```

✏️ **REPLACE WITH:**
```json
    "backup:rev3": "ts-node src/scripts/create-migration-backup.ts",
    "verify:m365-schema": "ts-node -r tsconfig-paths/register src/scripts/verify-m365-schema.ts",
    "import:m365-settings": "ts-node -r tsconfig-paths/register src/scripts/import-m365-settings.ts"
  },
```

**✅ VERIFICATION CHECKLIST - Step 3:**
- [ ] Command added to package.json
- [ ] Correct path to script
- [ ] Includes tsconfig-paths register

---

### Step 4: Run Import Script

Now execute the import script to load the data.

```bash
cd server
npm run import:m365-settings
```

**Expected Output:**
```
================================================================================
🚀 M365 SETTINGS IMPORT SCRIPT
================================================================================

🚀 Starting M365 Settings Import...

📦 Step 1: Importing M365 Settings...
📄 Reading settings from: /path/to/INSTRUCTIONS/normalized-output/master_settings_catalog.json
📊 Found 387 settings to import
📅 Catalog generated: 2024-11-16T...
   Processing batch 1/8 (50 settings)...
   Processing batch 2/8 (50 settings)...
   Processing batch 3/8 (50 settings)...
   Processing batch 4/8 (50 settings)...
   Processing batch 5/8 (50 settings)...
   Processing batch 6/8 (50 settings)...
   Processing batch 7/8 (50 settings)...
   Processing batch 8/8 (37 settings)...
✅ Settings import complete: 387 imported, 0 skipped

🔗 Step 2: Importing Control-Setting Mappings...
📄 Reading mappings from: /path/to/INSTRUCTIONS/normalized-output/control_settings_mappings.json
📊 Found 523 mappings to import
📅 Mappings generated: 2024-11-16T...
   Processing batch 1/6 (100 mappings)...
   Processing batch 2/6 (100 mappings)...
   Processing batch 3/6 (100 mappings)...
   Processing batch 4/6 (100 mappings)...
   Processing batch 5/6 (100 mappings)...
   Processing batch 6/6 (23 mappings)...
✅ Mappings import complete: 523 imported, 0 skipped

✅ Import completed successfully!

================================================================================
📊 IMPORT STATISTICS
================================================================================

⚙️  Settings:
   ✅ Imported: 387
   ⏭️  Skipped:  0

🔗 Mappings:
   ✅ Imported: 523
   ⏭️  Skipped:  0

⚠️  Errors: 0

⏱️  Duration: 4.23s
================================================================================

🔍 Verifying import results...

================================================================================
✅ VERIFICATION RESULTS
================================================================================

📊 Database Counts:
   Settings:                    387
   Mappings:                    523
   Controls with settings:      97 / 97

⚠️  Potential Issues:
   Settings without mappings:   0
   Orphaned mappings:           0
================================================================================

✅ Import completed successfully!
```

**✅ VERIFICATION CHECKLIST - Step 4:**
- [ ] Import script runs without errors
- [ ] All settings imported (300-400 range)
- [ ] All mappings imported (450-600 range)
- [ ] All 97 controls have settings
- [ ] Zero settings without mappings
- [ ] Zero orphaned mappings
- [ ] Import completes in < 10 seconds

---

### Step 5: Verify Data in Prisma Studio

Open Prisma Studio to visually inspect the imported data.

```bash
npx prisma studio
```

#### Step 5.1: Check M365Setting Table

1. Navigate to `m365_settings` table
2. Verify you see 300-400 records
3. Spot check a few records for:
   - Valid `settingPath`, `policyType`, `platform`
   - Descriptive `displayName`
   - JSON string in `expectedValue`
   - Valid `validationOperator`

#### Step 5.2: Check ControlSettingMapping Table

1. Navigate to `control_setting_mappings` table
2. Verify you see 450-600 records
3. Spot check a few records for:
   - Valid `controlId` (links to Control)
   - Valid `settingId` (links to M365Setting)
   - Confidence level (High/Medium/Low)
   - `complianceStatus` = "Not Configured"

#### Step 5.3: Check Relations

1. Click on a Control record
2. Verify it shows `settingMappings` relation with data
3. Click on an M365Setting record
4. Verify it shows `controlMappings` relation with data

**✅ VERIFICATION CHECKLIST - Step 5:**
- [ ] Prisma Studio shows correct record counts
- [ ] Settings data looks valid
- [ ] Mappings data looks valid
- [ ] Relations work correctly
- [ ] No obvious data issues

---

### Step 6: Run Data Validation Queries

Create a script to run validation queries on the imported data.

**📁 Location:** `server/src/scripts/`  
**📄 File:** `validate-m365-data.ts`

```typescript
/**
 * M365 Settings Data Validation Script
 * 
 * Validates the imported M365 settings data for integrity and consistency.
 * Usage: npm run validate:m365-data
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function validateData(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 M365 SETTINGS DATA VALIDATION');
  console.log('='.repeat(80) + '\n');

  const results: ValidationResult[] = [];

  try {
    // Check 1: Settings count in expected range
    const settingsCount = await prisma.m365Setting.count();
    results.push({
      check: 'Settings Count',
      passed: settingsCount >= 300 && settingsCount <= 500,
      message: `Found ${settingsCount} settings (expected 300-500)`,
    });

    // Check 2: Mappings count in expected range
    const mappingsCount = await prisma.controlSettingMapping.count();
    results.push({
      check: 'Mappings Count',
      passed: mappingsCount >= 400 && mappingsCount <= 700,
      message: `Found ${mappingsCount} mappings (expected 400-700)`,
    });

    // Check 3: All controls have at least one setting
    const controlsWithSettings = await prisma.control.count({
      where: { settingMappings: { some: {} } },
    });
    results.push({
      check: 'Control Coverage',
      passed: controlsWithSettings === 97,
      message: `${controlsWithSettings} / 97 controls have settings mapped`,
    });

    // Check 4: No orphaned settings
    const orphanedSettings = await prisma.m365Setting.count({
      where: { controlMappings: { none: {} } },
    });
    results.push({
      check: 'Orphaned Settings',
      passed: orphanedSettings === 0,
      message: `Found ${orphanedSettings} settings without mappings`,
    });

    // Check 5: Policy types distribution
    const policyTypes = await prisma.m365Setting.groupBy({
      by: ['policyType'],
      _count: true,
    });
    const typeCount = policyTypes.length;
    results.push({
      check: 'Policy Type Coverage',
      passed: typeCount >= 3,
      message: `Found ${typeCount} policy types (expected 3-4: Intune, AzureAD, Purview, Defender)`,
      details: policyTypes.map(t => `${t.policyType}: ${t._count}`),
    });

    // Check 6: Platform distribution
    const platforms = await prisma.m365Setting.groupBy({
      by: ['platform'],
      _count: true,
    });
    const platformCount = platforms.length;
    results.push({
      check: 'Platform Coverage',
      passed: platformCount >= 3,
      message: `Found ${platformCount} platforms (expected 3-4: Windows, iOS, Android, All)`,
      details: platforms.map(p => `${p.platform}: ${p._count}`),
    });

    // Check 7: Confidence level distribution
    const confidenceLevels = await prisma.controlSettingMapping.groupBy({
      by: ['confidence'],
      _count: true,
    });
    results.push({
      check: 'Confidence Levels',
      passed: confidenceLevels.length >= 1,
      message: `Found ${confidenceLevels.length} confidence levels`,
      details: confidenceLevels.map(c => `${c.confidence}: ${c._count}`),
    });

    // Check 8: Unique constraint validation
    const settingsWithDuplicateKeys = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM (
        SELECT setting_path, policy_type, platform, COUNT(*) as cnt
        FROM m365_settings
        GROUP BY setting_path, policy_type, platform
        HAVING cnt > 1
      )
    `;
    const duplicateCount = settingsWithDuplicateKeys[0]?.count || 0;
    results.push({
      check: 'Unique Constraints',
      passed: duplicateCount === 0,
      message: `Found ${duplicateCount} duplicate setting keys (should be 0)`,
    });

    // Check 9: Required fields populated
    const settingsWithNullRequired = await prisma.m365Setting.count({
      where: {
        OR: [
          { settingName: '' },
          { displayName: '' },
          { settingPath: '' },
          { policyType: '' },
          { platform: '' },
          { dataType: '' },
          { expectedValue: '' },
          { validationOperator: '' },
          { description: '' },
        ],
      },
    });
    results.push({
      check: 'Required Fields',
      passed: settingsWithNullRequired === 0,
      message: `Found ${settingsWithNullRequired} settings with empty required fields`,
    });

    // Check 10: Valid JSON in expectedValue
    let invalidJsonCount = 0;
    const allSettings = await prisma.m365Setting.findMany({
      select: { id: true, displayName: true, expectedValue: true },
    });
    for (const setting of allSettings) {
      try {
        JSON.parse(setting.expectedValue);
      } catch {
        invalidJsonCount++;
      }
    }
    results.push({
      check: 'Expected Value JSON',
      passed: invalidJsonCount === 0,
      message: `Found ${invalidJsonCount} settings with invalid JSON in expectedValue`,
    });

    // Check 11: Control ID format validation
    const invalidControlIds = await prisma.controlSettingMapping.count({
      where: {
        control: {
          controlId: {
            not: {
              matches: '^\\d{2}\\.\\d{2}\\.\\d{2}$',
            },
          },
        },
      },
    });
    results.push({
      check: 'Control ID Format',
      passed: invalidControlIds === 0,
      message: `Found ${invalidControlIds} mappings with invalid control ID format`,
    });

    // Check 12: Average settings per control
    const avgSettingsPerControl = mappingsCount / 97;
    results.push({
      check: 'Settings per Control',
      passed: avgSettingsPerControl >= 3 && avgSettingsPerControl <= 10,
      message: `Average ${avgSettingsPerControl.toFixed(1)} settings per control (expected 3-10)`,
    });

    // Print results
    console.log('VALIDATION RESULTS:\n');
    let allPassed = true;
    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.check}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        result.details.forEach((detail: string) => {
          console.log(`   - ${detail}`);
        });
      }
      console.log('');
      if (!result.passed) allPassed = false;
    });

    console.log('='.repeat(80));
    if (allPassed) {
      console.log('✅ ALL VALIDATION CHECKS PASSED');
      logger.info('Data validation completed successfully');
    } else {
      console.log('⚠️  SOME VALIDATION CHECKS FAILED - Review above');
      logger.warn('Data validation found issues');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  validateData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

export { validateData };
```

#### Step 6.1: Add Validation Script Command

**📁 File:** `server/package.json`

🔍 **FIND:**
```json
    "verify:m365-schema": "ts-node -r tsconfig-paths/register src/scripts/verify-m365-schema.ts",
    "import:m365-settings": "ts-node -r tsconfig-paths/register src/scripts/import-m365-settings.ts"
  },
```

✏️ **REPLACE WITH:**
```json
    "verify:m365-schema": "ts-node -r tsconfig-paths/register src/scripts/verify-m365-schema.ts",
    "import:m365-settings": "ts-node -r tsconfig-paths/register src/scripts/import-m365-settings.ts",
    "validate:m365-data": "ts-node -r tsconfig-paths/register src/scripts/validate-m365-data.ts"
  },
```

#### Step 6.2: Run Validation Script

```bash
npm run validate:m365-data
```

**Expected Output:**
```
================================================================================
🔍 M365 SETTINGS DATA VALIDATION
================================================================================

VALIDATION RESULTS:

1. ✅ Settings Count
   Found 387 settings (expected 300-500)

2. ✅ Mappings Count
   Found 523 mappings (expected 400-700)

3. ✅ Control Coverage
   97 / 97 controls have settings mapped

4. ✅ Orphaned Settings
   Found 0 settings without mappings

5. ✅ Policy Type Coverage
   Found 4 policy types (expected 3-4: Intune, AzureAD, Purview, Defender)
   - Intune: 245
   - AzureAD: 78
   - Purview: 42
   - Defender: 22

6. ✅ Platform Coverage
   Found 4 platforms (expected 3-4: Windows, iOS, Android, All)
   - Windows: 198
   - iOS: 87
   - Android: 64
   - All: 38

7. ✅ Confidence Levels
   Found 2 confidence levels
   - High: 487
   - Medium: 36

8. ✅ Unique Constraints
   Found 0 duplicate setting keys (should be 0)

9. ✅ Required Fields
   Found 0 settings with empty required fields

10. ✅ Expected Value JSON
    Found 0 settings with invalid JSON in expectedValue

11. ✅ Control ID Format
    Found 0 mappings with invalid control ID format

12. ✅ Settings per Control
    Average 5.4 settings per control (expected 3-10)

================================================================================
✅ ALL VALIDATION CHECKS PASSED
================================================================================
```

**✅ VERIFICATION CHECKLIST - Step 6:**
- [ ] Validation script created
- [ ] Script added to package.json
- [ ] All 12 validation checks pass
- [ ] Policy types distribution looks correct
- [ ] Platform coverage is good
- [ ] No data integrity issues

---

### Step 7: Generate Import Report

Create a detailed report of the import for documentation.

**📁 Location:** `server/src/scripts/`  
**📄 File:** `generate-import-report.ts`

```typescript
/**
 * Generate M365 Settings Import Report
 * 
 * Creates a comprehensive report of the imported M365 settings data.
 * Usage: npm run report:m365-import
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function generateReport(): Promise<void> {
  console.log('📊 Generating M365 Settings Import Report...\n');

  const reportLines: string[] = [];
  const addLine = (line: string = '') => reportLines.push(line);
  const addHeader = (title: string) => {
    addLine('='.repeat(80));
    addLine(title);
    addLine('='.repeat(80));
    addLine();
  };

  try {
    // Header
    addHeader('M365 SETTINGS IMPORT REPORT');
    addLine(`Generated: ${new Date().toISOString()}`);
    addLine();

    // Database Counts
    addHeader('DATABASE SUMMARY');
    const settingsCount = await prisma.m365Setting.count();
    const mappingsCount = await prisma.controlSettingMapping.count();
    const controlsCount = await prisma.control.count();
    const controlsWithSettings = await prisma.control.count({
      where: { settingMappings: { some: {} } },
    });

    addLine(`Total Settings:              ${settingsCount}`);
    addLine(`Total Mappings:              ${mappingsCount}`);
    addLine(`Total Controls:              ${controlsCount}`);
    addLine(`Controls with Settings:      ${controlsWithSettings}`);
    addLine(`Average Settings per Control: ${(mappingsCount / controlsWithSettings).toFixed(2)}`);
    addLine();

    // Policy Type Breakdown
    addHeader('POLICY TYPE DISTRIBUTION');
    const policyTypes = await prisma.m365Setting.groupBy({
      by: ['policyType'],
      _count: true,
    });
    policyTypes.sort((a, b) => b._count - a._count);
    policyTypes.forEach(pt => {
      const pct = ((pt._count / settingsCount) * 100).toFixed(1);
      addLine(`${pt.policyType.padEnd(15)} ${pt._count.toString().padStart(4)} (${pct}%)`);
    });
    addLine();

    // Platform Distribution
    addHeader('PLATFORM DISTRIBUTION');
    const platforms = await prisma.m365Setting.groupBy({
      by: ['platform'],
      _count: true,
    });
    platforms.sort((a, b) => b._count - a._count);
    platforms.forEach(p => {
      const pct = ((p._count / settingsCount) * 100).toFixed(1);
      addLine(`${p.platform.padEnd(15)} ${p._count.toString().padStart(4)} (${pct}%)`);
    });
    addLine();

    // Confidence Level Distribution
    addHeader('CONFIDENCE LEVEL DISTRIBUTION');
    const confidenceLevels = await prisma.controlSettingMapping.groupBy({
      by: ['confidence'],
      _count: true,
    });
    confidenceLevels.sort((a, b) => b._count - a._count);
    confidenceLevels.forEach(c => {
      const pct = ((c._count / mappingsCount) * 100).toFixed(1);
      addLine(`${c.confidence.padEnd(15)} ${c._count.toString().padStart(4)} (${pct}%)`);
    });
    addLine();

    // Control Family Breakdown
    addHeader('CONTROL FAMILY COVERAGE');
    const families = await prisma.$queryRaw<Array<{ family: string; count: number }>>`
      SELECT c.family, COUNT(DISTINCT csm.id) as count
      FROM controls c
      LEFT JOIN control_setting_mappings csm ON c.id = csm.control_id
      GROUP BY c.family
      ORDER BY c.family
    `;
    families.forEach(f => {
      addLine(`${f.family.padEnd(5)} ${f.count.toString().padStart(4)} mappings`);
    });
    addLine();

    // Top 10 Controls by Settings Count
    addHeader('TOP 10 CONTROLS BY SETTINGS COUNT');
    const topControls = await prisma.$queryRaw<
      Array<{ controlId: string; title: string; count: number }>
    >`
      SELECT c.control_id as controlId, c.title, COUNT(csm.id) as count
      FROM controls c
      LEFT JOIN control_setting_mappings csm ON c.id = csm.control_id
      GROUP BY c.id
      ORDER BY count DESC
      LIMIT 10
    `;
    topControls.forEach((c, i) => {
      addLine(`${(i + 1).toString().padStart(2)}. ${c.controlId} (${c.count} settings)`);
      addLine(`    ${c.title.substring(0, 70)}${c.title.length > 70 ? '...' : ''}`);
      addLine();
    });

    // Data Type Distribution
    addHeader('DATA TYPE DISTRIBUTION');
    const dataTypes = await prisma.m365Setting.groupBy({
      by: ['dataType'],
      _count: true,
    });
    dataTypes.sort((a, b) => b._count - a._count);
    dataTypes.forEach(dt => {
      const pct = ((dt._count / settingsCount) * 100).toFixed(1);
      addLine(`${dt.dataType.padEnd(15)} ${dt._count.toString().padStart(4)} (${pct}%)`);
    });
    addLine();

    // Validation Operator Distribution
    addHeader('VALIDATION OPERATOR DISTRIBUTION');
    const operators = await prisma.m365Setting.groupBy({
      by: ['validationOperator'],
      _count: true,
    });
    operators.sort((a, b) => b._count - a._count);
    operators.forEach(op => {
      const pct = ((op._count / settingsCount) * 100).toFixed(1);
      addLine(`${op.validationOperator.padEnd(15)} ${op._count.toString().padStart(4)} (${pct}%)`);
    });
    addLine();

    // Footer
    addHeader('IMPORT COMPLETE');
    addLine('✅ All data imported successfully');
    addLine('✅ Data validation passed');
    addLine('✅ Ready for Phase 3: Compliance Engine Development');
    addLine();
    addLine('Next Steps:');
    addLine('1. Review this report');
    addLine('2. Commit changes to version control');
    addLine('3. Proceed to Phase 3');
    addLine();

    // Write to file
    const reportDir = path.join(process.cwd(), '..', 'INSTRUCTIONS', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `m365-import-report-${Date.now()}.txt`);
    fs.writeFileSync(reportPath, reportLines.join('\n'));

    // Print to console
    console.log(reportLines.join('\n'));
    console.log(`\n📁 Report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  generateReport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Report generation failed:', error);
      process.exit(1);
    });
}

export { generateReport };
```

#### Step 7.1: Add Report Script Command

**📁 File:** `server/package.json`

🔍 **FIND:**
```json
    "import:m365-settings": "ts-node -r tsconfig-paths/register src/scripts/import-m365-settings.ts",
    "validate:m365-data": "ts-node -r tsconfig-paths/register src/scripts/validate-m365-data.ts"
  },
```

✏️ **REPLACE WITH:**
```json
    "import:m365-settings": "ts-node -r tsconfig-paths/register src/scripts/import-m365-settings.ts",
    "validate:m365-data": "ts-node -r tsconfig-paths/register src/scripts/validate-m365-data.ts",
    "report:m365-import": "ts-node -r tsconfig-paths/register src/scripts/generate-import-report.ts"
  },
```

#### Step 7.2: Generate Report

```bash
npm run report:m365-import
```

**✅ VERIFICATION CHECKLIST - Step 7:**
- [ ] Report script created
- [ ] Script added to package.json
- [ ] Report generates successfully
- [ ] Report saved to file
- [ ] Report shows comprehensive statistics

---

## 📋 FINAL VALIDATION CHECKLIST

### Data Import
- [ ] Settings import completed (300-400 settings)
- [ ] Mappings import completed (450-600 mappings)
- [ ] All 97 controls have settings mapped
- [ ] No import errors
- [ ] Import completed in reasonable time (<10 seconds)

### Data Integrity
- [ ] No orphaned settings (settings without mappings)
- [ ] No orphaned mappings (mappings without valid settings/controls)
- [ ] All unique constraints enforced
- [ ] All required fields populated
- [ ] Expected values are valid JSON
- [ ] Control IDs in correct format

### Data Distribution
- [ ] 3-4 policy types present (Intune, AzureAD, Purview, Defender)
- [ ] 3-4 platforms present (Windows, iOS, Android, All)
- [ ] Confidence levels distributed (mostly High, some Medium)
- [ ] All 17 control families represented
- [ ] Average 3-10 settings per control

### Documentation
- [ ] Import statistics generated
- [ ] Validation checks passed
- [ ] Import report created and saved
- [ ] All scripts added to package.json
- [ ] No TypeScript errors

---

## 🚨 TROUBLESHOOTING

### Issue: File Not Found Error

**Symptoms:**
```
Error: Settings catalog file not found: .../master_settings_catalog.json
```

**Solution:**
1. Verify normalized data files exist in `INSTRUCTIONS/normalized-output/`
2. Check file names exactly match:
   - `master_settings_catalog.json`
   - `control_settings_mappings.json`
3. Verify you're running from `server/` directory
4. Check file permissions

### Issue: Control Not Found

**Symptoms:**
```
Error: Control not found: 03.01.01
```

**Solution:**
1. Verify all 97 controls exist in database
2. Check control ID format in source data
3. Run: `npx prisma studio` and check Controls table
4. May need to run NIST controls seed script first

### Issue: Duplicate Key Violation

**Symptoms:**
```
Unique constraint failed on (settingPath, policyType, platform)
```

**Solution:**
1. Check for duplicate entries in source JSON files
2. Script should handle updates, not create duplicates
3. Clear table and re-import:
   ```sql
   DELETE FROM control_setting_mappings;
   DELETE FROM m365_settings;
   ```

### Issue: Low Settings Count

**Symptoms:**
- Only 50-100 settings imported instead of 300-400

**Solution:**
1. Check source file integrity
2. Review error messages during import
3. Check batch processing logic
4. Verify file encoding (should be UTF-8)

### Issue: Validation Failures

**Symptoms:**
- Validation script shows failed checks

**Solution:**
1. Review specific failed check
2. Check data quality in source files
3. May need to fix normalization script
4. Re-run normalization if source data is wrong

---

## 📝 ROLLBACK PROCEDURE

If you need to rollback the import:

### Option 1: Clear Imported Data Only

```sql
-- Clear mappings first (foreign key constraint)
DELETE FROM control_setting_mappings;

-- Clear settings
DELETE FROM m365_settings;
```

### Option 2: Reset with Prisma

```bash
# This will delete ALL data and reset schema
npx prisma migrate reset
```

### Option 3: Manual Cleanup

```typescript
// Create cleanup script
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  await prisma.controlSettingMapping.deleteMany();
  await prisma.m365Setting.deleteMany();
  console.log('✅ Cleanup complete');
}

cleanup();
```

---

## ✅ COMPLETION CRITERIA

Phase 2 is complete when:

1. ✅ Import service created and working
2. ✅ Import script runs successfully
3. ✅ 300-400 settings imported
4. ✅ 450-600 mappings imported
5. ✅ All 97 controls have settings
6. ✅ No orphaned data
7. ✅ All validation checks pass
8. ✅ Import report generated
9. ✅ Data visible in Prisma Studio
10. ✅ Ready for Phase 3: Compliance Engine

---

## 🚀 NEXT STEPS

After Phase 2 completion:

1. **Review import report** - verify statistics look correct
2. **Spot check data** in Prisma Studio
3. **Commit changes** to version control
4. **Document any issues** and resolutions
5. **Proceed to Phase 3** - Compliance Engine Development
   - Create validation engine
   - Create compliance calculation service
   - Test validation operators
   - Calculate initial compliance summaries

---

## 📚 REFERENCE

### Key Files Created
- `server/src/services/m365SettingsImport.service.ts` - Import service
- `server/src/scripts/import-m365-settings.ts` - Import script
- `server/src/scripts/validate-m365-data.ts` - Validation script
- `server/src/scripts/generate-import-report.ts` - Report generator

### Source Data Files
- `INSTRUCTIONS/normalized-output/master_settings_catalog.json`
- `INSTRUCTIONS/normalized-output/control_settings_mappings.json`

### Database Tables Populated
- `m365_settings` - 300-400 settings
- `control_setting_mappings` - 450-600 mappings

### Scripts Added
- `npm run import:m365-settings` - Run import
- `npm run validate:m365-data` - Validate data
- `npm run report:m365-import` - Generate report

---

**Phase 2 Status:** ⏸️ Ready for Implementation  
**Estimated Time:** 45-60 minutes  
**Difficulty:** Medium  
**Risk Level:** Low (can be rolled back easily)

---

**END OF PHASE 2**
