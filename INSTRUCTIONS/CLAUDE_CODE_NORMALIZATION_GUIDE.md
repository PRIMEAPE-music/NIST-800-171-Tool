# M365 Settings Normalization - Claude Code Implementation Guide

**Project:** NIST 800-171 Compliance Management Application  
**Task:** Normalize and deduplicate M365 policy settings from nested folder structure  
**Target:** Claude Code Execution  
**Date:** 2024-11-16

---

## 📋 TASK OVERVIEW

### What You Need To Do

Process all M365 policy settings JSON files, deduplicate them, and generate clean import files.

### File Structure

```
POLICY SETTINGS/
├── 03.01.XX/
│   ├── 03.01.01/
│   │   └── control_03_01_01_settings.json
│   ├── 03.01.02/
│   │   └── control_03_01_02_settings.json
│   ├── 03.01.03/
│   │   └── control_03_01_03_settings.json
│   └── ...
├── 03.02.XX/
│   ├── 03.02.01/
│   │   └── control_03_02_01_settings.json
│   ├── 03.02.02/
│   │   └── control_03_02_02_settings.json
│   └── ...
├── 03.03.XX/
├── 03.04.XX/
├── 03.05.XX/
├── 03.06.XX/
├── 03.07.XX/
├── 03.08.XX/
├── 03.09.XX/
├── 03.10.XX/
├── 03.11.XX/
├── 03.12.XX/
├── 03.13.XX/
├── 03.14.XX/
├── 03.15.XX/
├── 03.16.XX/
└── 03.17.XX/
```

### Expected Output

```
normalized-output/
├── master_settings_catalog.json      # All unique settings
├── control_settings_mappings.json    # Control-to-setting relationships
├── normalization_stats.json          # Detailed statistics
└── SUMMARY.txt                        # Human-readable summary
```

---

## 🎯 IMPLEMENTATION STEPS

### Phase 1: Create Normalization Script

**📁 Location:** Create in project root  
**📄 File:** `normalize_m365_settings.js`

#### Script Requirements

The script must:
1. Recursively scan `POLICY SETTINGS/` directory
2. Find all `control_*_settings.json` files in nested folders
3. Extract and deduplicate settings based on `(settingPath, policyType, platform)`
4. Preserve all control mappings
5. Generate 4 output files

#### Code Implementation

```javascript
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
  inputDir: './POLICY SETTINGS',
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
```

**✅ VERIFICATION CHECKLIST - Phase 1:**
- [ ] File created: `normalize_m365_settings.js` in project root
- [ ] File contains complete script code
- [ ] Script handles nested folder structure
- [ ] Script recursively finds JSON files
- [ ] Script extracts control IDs from paths

---

### Phase 2: Run the Normalization Script

**📍 Working Directory:** Project root (where `POLICY SETTINGS/` folder is located)

#### Step 2.1: Verify Directory Structure

```bash
# Check that POLICY SETTINGS folder exists
ls -la "POLICY SETTINGS/"

# Count control family folders (should be ~17)
ls -d "POLICY SETTINGS"/03.*.XX/ | wc -l

# Sample a few control folders to verify structure
ls -la "POLICY SETTINGS/03.01.XX/"
ls -la "POLICY SETTINGS/03.05.XX/"
```

**Expected Output:**
```
03.01.XX/
03.02.XX/
03.03.XX/
...
03.17.XX/
```

**✅ VERIFICATION CHECKLIST - Step 2.1:**
- [ ] `POLICY SETTINGS/` directory exists
- [ ] Contains ~17 control family folders (03.XX.XX)
- [ ] Each family folder contains control subfolders (03.XX.01, 03.XX.02, etc.)
- [ ] Each control folder contains JSON file

#### Step 2.2: Execute Normalization

```bash
# Run the normalization script
node normalize_m365_settings.js
```

**Expected Console Output:**
```
🚀 M365 Settings Normalization Script
═══════════════════════════════════════════════════════
Input:  ./POLICY SETTINGS
Output: ./normalized-output
Structure: Nested folders (03.XX.XX/03.XX.XX/)

🔍 Scanning directory structure: ./POLICY SETTINGS

═══════════════════════════════════════════════════════

📊 Found 97 JSON files in nested structure

📄 Processing: 03.01.XX/03.01.01/control_03_01_01_settings.json
   Control: 03.01.01
   Found 35 settings
   ✅ NEW: Conditional Access Policy State
      AzureAD/All
   ✅ NEW: Conditional Access Grant Controls
      AzureAD/All
   ...
   
📄 Processing: 03.01.XX/03.01.02/control_03_01_02_settings.json
   Control: 03.01.02
   Found 28 settings
   🔄 DUPLICATE: Conditional Access Policy State
      Reusing existing setting from catalog
   ✅ NEW: User Risk Policy State
      AzureAD/All
   ...

[... continues for all 97 files ...]

═══════════════════════════════════════════════════════

📦 Generating output files...

✅ master_settings_catalog.json
   347 unique settings
✅ control_settings_mappings.json
   521 control mappings
✅ normalization_stats.json
✅ SUMMARY.txt

═══════════════════════════════════════════════════════
✨ NORMALIZATION COMPLETE!
═══════════════════════════════════════════════════════

📊 Final Statistics:
   Files Processed:          97
   Control Families:         17
   Settings Processed:       521
   Unique Settings:          347
   Duplicates Found:         174
   Control Mappings:         521

📂 Output Directory: ./normalized-output

✅ Review SUMMARY.txt for detailed results
```

**✅ VERIFICATION CHECKLIST - Step 2.2:**
- [ ] Script completed without fatal errors
- [ ] Processed 97 JSON files
- [ ] Found all 17 control families
- [ ] Unique settings count: 300-500 range
- [ ] Deduplication rate: 30-50%
- [ ] Output directory created

---

### Phase 3: Verify Output Files

#### Step 3.1: Check Output Directory

```bash
# Navigate to output directory
cd normalized-output

# List all generated files
ls -lh

# Expected files:
# - master_settings_catalog.json
# - control_settings_mappings.json
# - normalization_stats.json
# - SUMMARY.txt
```

**✅ VERIFICATION CHECKLIST - Step 3.1:**
- [ ] Directory `normalized-output/` exists
- [ ] Contains 4 files
- [ ] Files are not empty (check sizes)

#### Step 3.2: Review SUMMARY.txt

```bash
# Display the summary
cat SUMMARY.txt
```

**Check for:**
- ✅ All 17 control families processed
- ✅ No critical errors
- ✅ Deduplication rate in 30-50% range
- ✅ Settings distributed across all policy types
- ✅ All platforms represented

**✅ VERIFICATION CHECKLIST - Step 3.2:**
- [ ] Summary shows 97 files processed
- [ ] All 17 families listed (03.01.XX through 03.17.XX)
- [ ] Unique settings: 300-500
- [ ] No critical errors in warnings section
- [ ] Policy types: Intune, AzureAD, Purview, Defender all present
- [ ] Platforms: Windows, iOS, Android, All present

#### Step 3.3: Validate JSON Structure

```bash
# Check master settings catalog structure
node -e "const data = require('./master_settings_catalog.json'); console.log('Total Settings:', data.totalSettings); console.log('First Setting:', JSON.stringify(data.settings[0], null, 2));"

# Check control mappings structure
node -e "const data = require('./control_settings_mappings.json'); console.log('Total Mappings:', data.totalMappings); console.log('First Mapping:', JSON.stringify(data.mappings[0], null, 2));"
```

**Expected Master Settings Structure:**
```json
{
  "settingName": "state",
  "displayName": "Conditional Access Policy State",
  "settingPath": "state",
  "policyType": "AzureAD",
  "policySubType": "ConditionalAccess",
  "platform": "All",
  "dataType": "string",
  "expectedValue": "enabled",
  "validationOperator": "==",
  "description": "...",
  "implementationGuide": "...",
  "microsoftDocUrl": "..."
}
```

**Expected Mappings Structure:**
```json
{
  "uniqueKey": "state|AzureAD|All",
  "controlId": "03.01.01",
  "confidence": "High",
  "isRequired": true,
  "mappingRationale": "...",
  "nistRequirement": "..."
}
```

**✅ VERIFICATION CHECKLIST - Step 3.3:**
- [ ] Master catalog has valid JSON structure
- [ ] Settings have all required fields
- [ ] Mappings reference settings via uniqueKey
- [ ] Control IDs are in format "03.XX.XX"

#### Step 3.4: Check for Inconsistencies

```bash
# Look for any inconsistency warnings
node -e "const data = require('./normalization_stats.json'); const errors = data.errors.filter(e => e.type === 'inconsistency'); console.log('Inconsistencies:', errors.length); if (errors.length > 0) console.log(JSON.stringify(errors, null, 2));"
```

**If inconsistencies found:**
1. Review the specific settings flagged
2. Determine which value is correct
3. Update source JSON files in `POLICY SETTINGS/`
4. Re-run normalization script

**✅ VERIFICATION CHECKLIST - Step 3.4:**
- [ ] Zero inconsistencies (ideal)
- [ ] OR inconsistencies reviewed and documented
- [ ] If inconsistencies exist, decision made on resolution

---

### Phase 4: Generate Statistics Report

#### Step 4.1: Create Analysis Script

**📁 Location:** Project root  
**📄 File:** `analyze_normalization.js`

```javascript
/**
 * Analyze Normalization Results
 */

const fs = require('fs');
const path = require('path');

function analyzeResults() {
  console.log('\n📊 M365 Settings Normalization Analysis\n');
  console.log('='.repeat(80));
  
  // Load files
  const catalog = require('./normalized-output/master_settings_catalog.json');
  const mappings = require('./normalized-output/control_settings_mappings.json');
  const stats = require('./normalized-output/normalization_stats.json');
  
  // Basic Counts
  console.log('\n📈 BASIC STATISTICS\n');
  console.log(`Total Unique Settings:     ${catalog.totalSettings}`);
  console.log(`Total Control Mappings:    ${mappings.totalMappings}`);
  console.log(`Files Processed:           ${stats.summary.totalJsonFiles}`);
  console.log(`Control Families:          ${stats.controlFamilies.total}`);
  console.log(`Deduplication Rate:        ${stats.summary.deduplicationRate}`);
  
  // Settings Distribution
  console.log('\n🔧 POLICY TYPE DISTRIBUTION\n');
  Object.entries(stats.settingsByPolicyType).forEach(([type, count]) => {
    const pct = ((count / catalog.totalSettings) * 100).toFixed(1);
    console.log(`${type.padEnd(15)} ${count.toString().padStart(3)} settings (${pct}%)`);
  });
  
  // Platform Distribution
  console.log('\n📱 PLATFORM DISTRIBUTION\n');
  Object.entries(stats.settingsByPlatform).forEach(([platform, count]) => {
    const pct = ((count / catalog.totalSettings) * 100).toFixed(1);
    console.log(`${platform.padEnd(15)} ${count.toString().padStart(3)} settings (${pct}%)`);
  });
  
  // Control Family Coverage
  console.log('\n📁 CONTROL FAMILY COVERAGE\n');
  Object.entries(stats.controlFamilies.filesPerFamily)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([family, count]) => {
      console.log(`${family}  →  ${count.toString().padStart(2)} controls`);
    });
  
  // Mapping Analysis
  console.log('\n🔗 MAPPING ANALYSIS\n');
  
  // Count settings by number of controls they map to
  const settingMappingCounts = {};
  mappings.mappings.forEach(m => {
    settingMappingCounts[m.uniqueKey] = (settingMappingCounts[m.uniqueKey] || 0) + 1;
  });
  
  const distributionCounts = {};
  Object.values(settingMappingCounts).forEach(count => {
    distributionCounts[count] = (distributionCounts[count] || 0) + 1;
  });
  
  console.log('Settings by number of controls they map to:');
  Object.entries(distributionCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([numControls, numSettings]) => {
      console.log(`  ${numSettings} settings map to ${numControls} control(s)`);
    });
  
  // Most shared settings
  console.log('\n🔝 TOP 10 MOST SHARED SETTINGS\n');
  const sortedSettings = Object.entries(settingMappingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedSettings.forEach(([uniqueKey, count], index) => {
    // Find the setting display name
    const setting = catalog.settings.find(s => 
      `${s.settingPath}|${s.policyType}|${s.platform}` === uniqueKey
    );
    console.log(`${(index + 1).toString().padStart(2)}. ${setting?.displayName || uniqueKey}`);
    console.log(`    Maps to ${count} controls`);
  });
  
  // Confidence Distribution
  console.log('\n🎯 CONFIDENCE LEVEL DISTRIBUTION\n');
  const confidenceCounts = { High: 0, Medium: 0, Low: 0 };
  mappings.mappings.forEach(m => {
    confidenceCounts[m.confidence]++;
  });
  Object.entries(confidenceCounts).forEach(([level, count]) => {
    const pct = ((count / mappings.totalMappings) * 100).toFixed(1);
    console.log(`${level.padEnd(10)} ${count.toString().padStart(3)} mappings (${pct}%)`);
  });
  
  // Errors Summary
  if (stats.errors.length > 0) {
    console.log('\n⚠️  ISSUES DETECTED\n');
    const errorTypes = {};
    stats.errors.forEach(e => {
      const type = e.type || 'error';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    console.log('\nSee normalization_stats.json for details');
  } else {
    console.log('\n✅ NO ISSUES DETECTED\n');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Analysis Complete!\n');
}

try {
  analyzeResults();
} catch (error) {
  console.error('Error analyzing results:', error.message);
  process.exit(1);
}
```

**✅ VERIFICATION CHECKLIST - Step 4.1:**
- [ ] File created: `analyze_normalization.js`
- [ ] File contains analysis code

#### Step 4.2: Run Analysis

```bash
# Return to project root
cd ..

# Run analysis
node analyze_normalization.js
```

**✅ VERIFICATION CHECKLIST - Step 4.2:**
- [ ] Analysis runs successfully
- [ ] Shows distribution across policy types
- [ ] Shows distribution across platforms
- [ ] Lists most shared settings
- [ ] Shows confidence level distribution

---

## 📋 FINAL VALIDATION CHECKLIST

### Output Files Validation

- [ ] `master_settings_catalog.json` exists and is valid JSON
- [ ] Contains 300-500 unique settings
- [ ] All settings have required fields
- [ ] `expectedValue` is properly formatted (JSON string for arrays/objects)

- [ ] `control_settings_mappings.json` exists and is valid JSON
- [ ] Contains 450-600 mappings
- [ ] All mappings reference valid uniqueKeys
- [ ] Control IDs in format "03.XX.XX"

- [ ] `normalization_stats.json` exists and is valid JSON
- [ ] Shows all 17 control families processed
- [ ] Deduplication rate is reasonable (30-50%)

- [ ] `SUMMARY.txt` exists and is readable
- [ ] Shows comprehensive statistics
- [ ] Lists any errors or warnings

### Data Quality Validation

- [ ] Policy Types: All present (Intune, AzureAD, Purview, Defender)
- [ ] Platforms: All present (Windows, iOS, Android, All)
- [ ] Control Families: All 17 families (03.01.XX through 03.17.XX)
- [ ] Confidence Levels: Mix of High and Medium (mostly High)
- [ ] No critical inconsistencies OR inconsistencies documented

### Structure Validation

- [ ] Files processed from nested structure correctly
- [ ] Control IDs extracted properly from paths
- [ ] Settings deduplicated based on (settingPath, policyType, platform)
- [ ] Control mappings preserve all relationships

---

## 🎯 SUCCESS CRITERIA

**The normalization is successful when:**

1. ✅ All 97 control JSON files processed
2. ✅ All 17 control families represented
3. ✅ 300-500 unique settings in catalog
4. ✅ 30-50% deduplication rate
5. ✅ 450-600 control mappings created
6. ✅ No critical errors in stats
7. ✅ All policy types and platforms represented
8. ✅ Output files are valid JSON
9. ✅ SUMMARY.txt provides clear overview
10. ✅ Ready for database import

---

## 📝 NOTES FOR CLAUDE CODE

### If Issues Arise

**Problem: JSON parsing errors**
- Check file encoding (should be UTF-8)
- Verify JSON structure in source files
- Look for trailing commas or syntax errors

**Problem: Missing control families**
- Verify folder naming is exactly "03.XX.XX"
- Check that all family folders exist
- Ensure permissions allow reading nested directories

**Problem: Low deduplication rate (<20%)**
- May indicate each control has truly unique settings
- Verify settings aren't artificially different (casing, formatting)
- Check if settingPath values are consistent

**Problem: High deduplication rate (>60%)**
- Normal if many controls share common settings
- Verify this is expected for your control structure

### Performance Notes

- Script should complete in < 2 minutes for 97 files
- Memory usage should be < 200MB
- If slower, check for extremely large JSON files

### Output Location

All files go to: `./normalized-output/`
- Ready for commit to version control
- Ready for import script
- Keep original `POLICY SETTINGS/` folder as source of truth

---

## 🚀 NEXT STEPS AFTER NORMALIZATION

1. **Review normalization_stats.json** for any issues
2. **Commit normalized files** to version control
3. **Create database import script** (separate task)
4. **Import to M365Setting and ControlSettingMapping tables**
5. **Verify imports** with sample queries
6. **Update Control Library** to display M365 settings

---

## ✅ COMPLETION CHECKLIST

**Mark complete when:**
- [ ] Script created and executable
- [ ] Script successfully processes all files
- [ ] All 4 output files generated
- [ ] SUMMARY.txt reviewed and acceptable
- [ ] Analysis script run and results reviewed
- [ ] No critical errors in stats
- [ ] Output files committed to repository
- [ ] Documentation updated with results

---

**END OF GUIDE**
