const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'nist-800-171-controls.json'), 'utf8'));

console.log('═══════════════════════════════════════════');
console.log('  NIST 800-171 Rev 3 Verification');
console.log('═══════════════════════════════════════════');
console.log(`Version: ${data.version}`);
console.log(`Publication: ${data.publicationDate}`);
console.log(`Total Controls: ${data.controls.length}/${data.totalControls}`);
console.log(`Families: ${Object.keys(data.families).length}/17`);
console.log('');
console.log('Family Breakdown:');

// Get all unique families from controls
const familiesInControls = [...new Set(data.controls.map(c => c.family))].sort();

// Create a map of actual counts
const actualCounts = {};
familiesInControls.forEach(code => {
  actualCounts[code] = data.controls.filter(c => c.family === code).length;
});

// Display each family
familiesInControls.forEach(code => {
  const familyInfo = data.families[code];
  const actualCount = actualCounts[code];

  if (familyInfo) {
    const expectedCount = familyInfo.controlCount;
    const status = actualCount === expectedCount ? '✓' : '✗';
    console.log(`  ${status} ${code}: ${actualCount}/${expectedCount} - ${familyInfo.name}`);
  } else {
    console.log(`  ⚠ ${code}: ${actualCount}/? - NOT IN FAMILIES METADATA`);
  }
});

console.log('');
console.log('Control ID Format Validation:');
const rev3Pattern = /^03\.\d{2}\.\d{2}$/;
const invalidControls = data.controls.filter(c => !rev3Pattern.test(c.controlId));
if (invalidControls.length === 0) {
  console.log('  ✓ All control IDs match Rev 3 format (03.XX.YY)');
} else {
  console.log(`  ✗ ${invalidControls.length} controls have invalid format:`);
  invalidControls.forEach(c => console.log(`    - ${c.controlId}`));
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log(`Status: ${invalidControls.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
console.log('═══════════════════════════════════════════');
