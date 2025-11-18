/**
 * M365 Settings Normalization Script - Nested Folder Structure
 *
 * Purpose: Process all control JSON files from nested folders, extract settings,
 * deduplicate, and generate clean master catalog and mapping files.
 *
 * Usage: node normalize_m365_settings.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  inputDir: './INSTRUCTIONS/POLICY SETTINGS',
  outputDir: './normalized-output',
  uniqueKeyFields: ['settingPath', 'policyType', 'platform'],
  preserveFields: [
    'settingName', 'displayName', 'settingPath',
    'policyType', 'policySubType', 'platform',
    'dataType', 'expectedValue', 'validationOperator',
    'description', 'implementationGuide', 'microsoftDocUrl'
  ]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Recursively find all JSON files in directory structure
 */
function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      findJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extract control ID from file path
 * Example: "POLICY SETTINGS/03.01.XX/03.01.01/control_03_01_01_settings.json" -> "03.01.01"
 */
function extractControlId(filePath) {
  const match = filePath.match(/(\d{2}\.\d{2}\.\d{2})/);
  return match ? match[1] : null;
}

// ============================================================================
// MAIN NORMALIZER CLASS
// ============================================================================

class SettingsNormalizer {
  constructor() {
    this.masterSettings = new Map();
    this.controlMappings = [];
    this.stats = {
      totalJsonFiles: 0,
      totalSettingsProcessed: 0,
      uniqueSettingsFound: 0,
      duplicatesDetected: 0,
      controlMappingsCreated: 0,
      errors: [],
      controlFamilies: new Set(),
      filesProcessedByFamily: {}
    };
  }

  /**
   * Generate unique key for a setting
   */
  generateUniqueKey(setting) {
    return `${setting.settingPath}|${setting.policyType}|${setting.platform}`;
  }

  /**
   * Process a single JSON file
   */
  processJsonFile(filePath) {
    const controlId = extractControlId(filePath);
    const relativePath = path.relative(CONFIG.inputDir, filePath);

    console.log(`\n📄 Processing: ${relativePath}`);
    if (controlId) {
      console.log(`   Control: ${controlId}`);
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      if (!data.settings || !Array.isArray(data.settings)) {
        throw new Error('Invalid JSON structure - missing "settings" array');
      }

      console.log(`   Found ${data.settings.length} settings`);

      // Track control families
      if (controlId) {
        const family = controlId.split('.')[1];
        this.stats.controlFamilies.add(`03.${family}.XX`);

        if (!this.stats.filesProcessedByFamily[`03.${family}.XX`]) {
          this.stats.filesProcessedByFamily[`03.${family}.XX`] = 0;
        }
        this.stats.filesProcessedByFamily[`03.${family}.XX`]++;
      }

      // Process each setting
      data.settings.forEach(setting => {
        this.processSetting(setting, controlId);
      });

      this.stats.totalJsonFiles++;

    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
      this.stats.errors.push({
        file: relativePath,
        error: error.message
      });
    }
  }

  /**
   * Process an individual setting
   */
  processSetting(setting, fileControlId) {
    this.stats.totalSettingsProcessed++;

    const uniqueKey = this.generateUniqueKey(setting);
    const controlMappings = setting.controlMappings || [];

    // Check if we've seen this setting before
    if (!this.masterSettings.has(uniqueKey)) {
      // New setting - add to master catalog
      const cleanSetting = this.cleanSetting(setting);
      this.masterSettings.set(uniqueKey, cleanSetting);
      this.stats.uniqueSettingsFound++;

      console.log(`   ✅ NEW: ${cleanSetting.displayName}`);
      console.log(`      ${cleanSetting.policyType}/${cleanSetting.platform}`);
    } else {
      // Duplicate detected
      this.stats.duplicatesDetected++;
      const existingSetting = this.masterSettings.get(uniqueKey);

      console.log(`   🔄 DUPLICATE: ${setting.displayName}`);
      console.log(`      Reusing existing setting from catalog`);

      // Validate consistency
      this.validateConsistency(existingSetting, setting);
    }

    // Create control mappings
    controlMappings.forEach(mapping => {
      this.controlMappings.push({
        uniqueKey: uniqueKey,
        controlId: mapping.controlId,
        confidence: mapping.confidence,
        isRequired: mapping.isRequired !== false,
        mappingRationale: mapping.mappingRationale,
        nistRequirement: mapping.nistRequirement
      });
      this.stats.controlMappingsCreated++;
    });
  }

  /**
   * Clean setting object
   */
  cleanSetting(setting) {
    const cleaned = {};

    CONFIG.preserveFields.forEach(field => {
      if (setting[field] !== undefined) {
        cleaned[field] = setting[field];
      }
    });

    // Convert expectedValue to JSON string if object/array
    if (cleaned.expectedValue !== undefined && typeof cleaned.expectedValue === 'object') {
      cleaned.expectedValue = JSON.stringify(cleaned.expectedValue);
    }

    return cleaned;
  }

  /**
   * Validate consistency between duplicate settings
   */
  validateConsistency(existing, duplicate) {
    const inconsistencies = [];
    const fieldsToCheck = ['displayName', 'dataType', 'expectedValue', 'validationOperator'];

    fieldsToCheck.forEach(field => {
      const existingVal = JSON.stringify(existing[field]);
      const duplicateVal = JSON.stringify(duplicate[field]);

      if (existingVal !== duplicateVal) {
        inconsistencies.push({
          field,
          existing: existing[field],
          duplicate: duplicate[field]
        });
      }
    });

    if (inconsistencies.length > 0) {
      console.warn(`   ⚠️  INCONSISTENCY DETECTED:`);
      inconsistencies.forEach(inc => {
        console.warn(`      ${inc.field}:`);
        console.warn(`        Existing:  ${JSON.stringify(inc.existing)}`);
        console.warn(`        Duplicate: ${JSON.stringify(inc.duplicate)}`);
      });

      this.stats.errors.push({
        type: 'inconsistency',
        setting: existing.displayName,
        details: inconsistencies
      });
    }
  }

  /**
   * Process all JSON files in directory structure
   */
  processDirectory() {
    console.log(`\n🔍 Scanning directory structure: ${CONFIG.inputDir}\n`);
    console.log('='.repeat(80));

    if (!fs.existsSync(CONFIG.inputDir)) {
      throw new Error(`Input directory does not exist: ${CONFIG.inputDir}`);
    }

    // Recursively find all JSON files
    const jsonFiles = findJsonFiles(CONFIG.inputDir);

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${CONFIG.inputDir}`);
    }

    console.log(`\n📊 Found ${jsonFiles.length} JSON files in nested structure\n`);

    // Process each file
    jsonFiles.forEach(filePath => {
      this.processJsonFile(filePath);
    });
  }

  /**
   * Generate output files
   */
  generateOutput() {
    console.log('\n' + '='.repeat(80));
    console.log('\n📦 Generating output files...\n');

    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 1. Master Settings Catalog
    const masterSettingsArray = Array.from(this.masterSettings.values());
    const masterCatalog = {
      version: "1.0.0",
      generated: new Date().toISOString(),
      totalSettings: masterSettingsArray.length,
      description: "Master catalog of all unique M365 settings for NIST 800-171 Rev 3 compliance",
      sourceStructure: "Nested folders: POLICY SETTINGS/03.XX.XX/03.XX.XX/",
      settings: masterSettingsArray
    };

    const catalogPath = path.join(CONFIG.outputDir, 'master_settings_catalog.json');
    fs.writeFileSync(catalogPath, JSON.stringify(masterCatalog, null, 2));
    console.log(`✅ master_settings_catalog.json`);
    console.log(`   ${masterSettingsArray.length} unique settings`);

    // 2. Control-to-Settings Mappings
    const mappingFile = {
      version: "1.0.0",
      generated: new Date().toISOString(),
      totalMappings: this.controlMappings.length,
      description: "Maps NIST controls to M365 settings (references by uniqueKey)",
      mappings: this.controlMappings
    };

    const mappingsPath = path.join(CONFIG.outputDir, 'control_settings_mappings.json');
    fs.writeFileSync(mappingsPath, JSON.stringify(mappingFile, null, 2));
    console.log(`✅ control_settings_mappings.json`);
    console.log(`   ${this.controlMappings.length} control mappings`);

    // 3. Statistics Report
    const statsReport = {
      generated: new Date().toISOString(),
      sourceDirectory: CONFIG.inputDir,
      summary: {
        totalJsonFiles: this.stats.totalJsonFiles,
        totalSettingsProcessed: this.stats.totalSettingsProcessed,
        uniqueSettingsFound: this.stats.uniqueSettingsFound,
        duplicatesDetected: this.stats.duplicatesDetected,
        controlMappingsCreated: this.stats.controlMappingsCreated,
        deduplicationRate: ((this.stats.duplicatesDetected / this.stats.totalSettingsProcessed) * 100).toFixed(2) + '%'
      },
      controlFamilies: {
        total: this.stats.controlFamilies.size,
        families: Array.from(this.stats.controlFamilies).sort(),
        filesPerFamily: this.stats.filesProcessedByFamily
      },
      errors: this.stats.errors,
      settingsByPolicyType: this.getSettingsByPolicyType(),
      settingsByPlatform: this.getSettingsByPlatform()
    };

    const statsPath = path.join(CONFIG.outputDir, 'normalization_stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(statsReport, null, 2));
    console.log(`✅ normalization_stats.json`);

    // 4. Human-readable summary
    this.generateTextSummary(statsReport);
    console.log(`✅ SUMMARY.txt`);
  }

  /**
   * Get settings grouped by policy type
   */
  getSettingsByPolicyType() {
    const groups = {};
    this.masterSettings.forEach(setting => {
      const type = setting.policyType;
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  /**
   * Get settings grouped by platform
   */
  getSettingsByPlatform() {
    const groups = {};
    this.masterSettings.forEach(setting => {
      const platform = setting.platform;
      groups[platform] = (groups[platform] || 0) + 1;
    });
    return groups;
  }

  /**
   * Generate human-readable text summary
   */
  generateTextSummary(statsReport) {
    const lines = [];

    lines.push('═'.repeat(80));
    lines.push('M365 SETTINGS NORMALIZATION SUMMARY');
    lines.push('═'.repeat(80));
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Source: ${CONFIG.inputDir}`);
    lines.push('');

    lines.push('📊 PROCESSING STATISTICS');
    lines.push('-'.repeat(80));
    lines.push(`JSON Files Processed:       ${statsReport.summary.totalJsonFiles}`);
    lines.push(`Total Settings Processed:   ${statsReport.summary.totalSettingsProcessed}`);
    lines.push(`Unique Settings Found:      ${statsReport.summary.uniqueSettingsFound}`);
    lines.push(`Duplicates Detected:        ${statsReport.summary.duplicatesDetected}`);
    lines.push(`Deduplication Rate:         ${statsReport.summary.deduplicationRate}`);
    lines.push(`Control Mappings Created:   ${statsReport.summary.controlMappingsCreated}`);
    lines.push('');

    lines.push('📁 CONTROL FAMILIES PROCESSED');
    lines.push('-'.repeat(80));
    lines.push(`Total Families: ${statsReport.controlFamilies.total}`);
    statsReport.controlFamilies.families.forEach(family => {
      const count = statsReport.controlFamilies.filesPerFamily[family] || 0;
      lines.push(`  ${family}  →  ${count} controls`);
    });
    lines.push('');

    lines.push('🔧 SETTINGS BY POLICY TYPE');
    lines.push('-'.repeat(80));
    Object.entries(statsReport.settingsByPolicyType).forEach(([type, count]) => {
      lines.push(`${type.padEnd(20)} ${count} settings`);
    });
    lines.push('');

    lines.push('📱 SETTINGS BY PLATFORM');
    lines.push('-'.repeat(80));
    Object.entries(statsReport.settingsByPlatform).forEach(([platform, count]) => {
      lines.push(`${platform.padEnd(20)} ${count} settings`);
    });
    lines.push('');

    if (statsReport.errors.length > 0) {
      lines.push('⚠️  WARNINGS & ERRORS');
      lines.push('-'.repeat(80));
      lines.push(`Total Issues: ${statsReport.errors.length}`);
      lines.push('');
      statsReport.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error.type || 'Error'}`);
        lines.push(`   File: ${error.file || error.setting || 'N/A'}`);
        if (error.details) {
          error.details.forEach(detail => {
            lines.push(`   - ${detail.field}: "${detail.existing}" vs "${detail.duplicate}"`);
          });
        }
        lines.push('');
      });
    }

    lines.push('═'.repeat(80));
    lines.push('✅ NEXT STEPS');
    lines.push('═'.repeat(80));
    lines.push('1. Review normalization_stats.json for any inconsistencies');
    lines.push('2. Verify master_settings_catalog.json contains all expected settings');
    lines.push('3. Check that all control families were processed');
    lines.push('4. Use these files with your import script to populate the database');
    lines.push('');
    lines.push('Output Location: ' + CONFIG.outputDir);
    lines.push('');

    const summaryPath = path.join(CONFIG.outputDir, 'SUMMARY.txt');
    fs.writeFileSync(summaryPath, lines.join('\n'));
  }

  /**
   * Print final statistics to console
   */
  printStats() {
    console.log('\n' + '═'.repeat(80));
    console.log('✨ NORMALIZATION COMPLETE!');
    console.log('═'.repeat(80));
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Files Processed:          ${this.stats.totalJsonFiles}`);
    console.log(`   Control Families:         ${this.stats.controlFamilies.size}`);
    console.log(`   Settings Processed:       ${this.stats.totalSettingsProcessed}`);
    console.log(`   Unique Settings:          ${this.stats.uniqueSettingsFound}`);
    console.log(`   Duplicates Found:         ${this.stats.duplicatesDetected}`);
    console.log(`   Control Mappings:         ${this.stats.controlMappingsCreated}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Warnings/Errors:         ${this.stats.errors.length}`);
      console.log(`   (See normalization_stats.json for details)`);
    }

    console.log(`\n📂 Output Directory: ${CONFIG.outputDir}`);
    console.log('\n✅ Review SUMMARY.txt for detailed results\n');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log('\n🚀 M365 Settings Normalization Script');
  console.log('═'.repeat(80));
  console.log(`Input:  ${CONFIG.inputDir}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  console.log(`Structure: Nested folders (03.XX.XX/03.XX.XX/)`);

  try {
    const normalizer = new SettingsNormalizer();

    // Process all JSON files
    normalizer.processDirectory();

    // Generate output files
    normalizer.generateOutput();

    // Print final stats
    normalizer.printStats();

  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { SettingsNormalizer };
