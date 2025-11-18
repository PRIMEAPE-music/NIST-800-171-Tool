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
    console.log(`${platform.padEnd(20)} ${count.toString().padStart(3)} settings (${pct}%)`);
  });

  // Control Family Coverage
  if (stats.controlFamilies.total > 0) {
    console.log('\n📁 CONTROL FAMILY COVERAGE\n');
    Object.entries(stats.controlFamilies.filesPerFamily)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([family, count]) => {
        console.log(`${family}  →  ${count.toString().padStart(2)} controls`);
      });
  } else {
    console.log('\n📁 CONTROL FAMILY COVERAGE\n');
    console.log('Note: Control family tracking not available (flat file structure)');
  }

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
