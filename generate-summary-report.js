const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('NIST 800-171 IMPROVEMENT ACTIONS - SUMMARY REPORT');
console.log('='.repeat(80));
console.log();

const jsonPath = path.join(__dirname, 'data', 'nist-improvement-actions.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Statistics
const controls = Object.keys(data.mappings);
let totalActions = 0;
const actionsByCategory = {};
const actionsByPriority = {};
const actionsPerControl = {};

for (const controlId in data.mappings) {
  const control = data.mappings[controlId];
  const actionCount = control.improvementActions.length;
  totalActions += actionCount;
  actionsPerControl[controlId] = actionCount;

  for (const action of control.improvementActions) {
    // Count by category
    if (!actionsByCategory[action.category]) {
      actionsByCategory[action.category] = 0;
    }
    actionsByCategory[action.category]++;

    // Count by priority
    if (!actionsByPriority[action.priority]) {
      actionsByPriority[action.priority] = 0;
    }
    actionsByPriority[action.priority]++;
  }
}

console.log('📊 OVERVIEW');
console.log('-'.repeat(80));
console.log(`Schema: ${data.$schema}`);
console.log(`Version: ${data.version}`);
console.log(`Last Updated: ${data.lastUpdated}`);
console.log(`Source: ${data.source}`);
console.log();

console.log('📈 STATISTICS');
console.log('-'.repeat(80));
console.log(`Total NIST 800-171 Controls Covered: ${controls.length}`);
console.log(`Total Improvement Actions: ${totalActions}`);
console.log(`Average Actions per Control: ${(totalActions / controls.length).toFixed(1)}`);
console.log();

console.log('🏷️  ACTIONS BY CATEGORY');
console.log('-'.repeat(80));
const sortedCategories = Object.entries(actionsByCategory).sort((a, b) => b[1] - a[1]);
for (const [category, count] of sortedCategories) {
  const percentage = ((count / totalActions) * 100).toFixed(1);
  console.log(`${category.padEnd(20)} : ${count.toString().padStart(3)} actions (${percentage}%)`);
}
console.log();

console.log('⚡ ACTIONS BY PRIORITY');
console.log('-'.repeat(80));
const sortedPriorities = Object.entries(actionsByPriority).sort((a, b) => b[1] - a[1]);
for (const [priority, count] of sortedPriorities) {
  const percentage = ((count / totalActions) * 100).toFixed(1);
  console.log(`${priority.padEnd(20)} : ${count.toString().padStart(3)} actions (${percentage}%)`);
}
console.log();

console.log('🎯 CONTROL FAMILIES BREAKDOWN');
console.log('-'.repeat(80));
const families = {
  '03.01': 'Access Control (AC)',
  '03.02': 'Awareness and Training (AT)',
  '03.03': 'Audit and Accountability (AU)',
  '03.04': 'Configuration Management (CM)',
  '03.05': 'Identification and Authentication (IA)',
  '03.06': 'Incident Response (IR)',
  '03.07': 'Maintenance (MA)',
  '03.08': 'Media Protection (MP)',
  '03.09': 'Personnel Security (PS)',
  '03.10': 'Physical Protection (PE)',
  '03.11': 'Risk Assessment (RA)',
  '03.12': 'Security Assessment (CA)',
  '03.13': 'System and Communications Protection (SC)',
  '03.14': 'System and Information Integrity (SI)'
};

const controlsByFamily = {};
for (const family in families) {
  controlsByFamily[family] = {
    name: families[family],
    controls: 0,
    actions: 0
  };
}

for (const controlId in data.mappings) {
  const family = controlId.substring(0, 5);
  if (controlsByFamily[family]) {
    controlsByFamily[family].controls++;
    controlsByFamily[family].actions += data.mappings[controlId].improvementActions.length;
  }
}

for (const family in controlsByFamily) {
  const info = controlsByFamily[family];
  if (info.controls > 0) {
    console.log(`${info.name.padEnd(50)} : ${info.controls.toString().padStart(2)} controls, ${info.actions.toString().padStart(3)} actions`);
  }
}
console.log();

console.log('🔝 TOP 10 CONTROLS BY ACTION COUNT');
console.log('-'.repeat(80));
const sortedControls = Object.entries(actionsPerControl).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [controlId, count] of sortedControls) {
  const control = data.mappings[controlId];
  console.log(`${controlId} (${count} actions)`);
  console.log(`   ${control.controlTitle}`);
}
console.log();

console.log('🔗 URL STRUCTURE');
console.log('-'.repeat(80));
const sampleAction = data.mappings[controls[0]].improvementActions[0];
console.log('Each improvement action includes:');
console.log('   • title: Action name');
console.log('   • category: Device, Identity, Data, Apps, Infrastructure, or General');
console.log('   • priority: Critical, High, Medium, or Low');
console.log('   • complianceManagerUrl: Direct link to filter in Compliance Manager');
console.log('   • actionSlug: URL-friendly identifier');
console.log('   • documentationUrl: (Placeholder for Microsoft Learn links)');
console.log();
console.log('Example URL:');
console.log(`   ${sampleAction.complianceManagerUrl.substring(0, 100)}...`);
console.log();

console.log('='.repeat(80));
console.log('✅ SUMMARY REPORT COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('📄 Files Generated:');
console.log('   • data/nist-improvement-actions.json - Main NIST 800-171 mappings');
console.log();
console.log('💡 Next Steps:');
console.log('   1. Update backend services to use nist-improvement-actions.json');
console.log('   2. Add Microsoft Learn documentation URLs where available');
console.log('   3. Test the Compliance Manager URLs to ensure they work');
console.log('   4. Consider backing up the old microsoft-improvement-actions.json');
console.log();
