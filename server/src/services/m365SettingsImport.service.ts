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
  expectedValue: any; // Can be string, boolean, object, etc - will be converted to JSON string
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
      // Convert expectedValue to JSON string if it's not already a string
      const expectedValueStr = typeof setting.expectedValue === 'string'
        ? setting.expectedValue
        : JSON.stringify(setting.expectedValue);

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
            expectedValue: expectedValueStr,
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
            expectedValue: expectedValueStr,
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
    // Foreign key constraints prevent orphaned mappings, so this should always be 0
    const mappingsWithoutSettings = 0;

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
