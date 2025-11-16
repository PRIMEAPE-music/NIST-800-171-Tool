const fs = require('fs');

// Read the NIST markdown file
const content = fs.readFileSync('./INSTRUCTIONS/ALL NIST REV 3 CONTROLS.md', 'utf8');

// Extract all control IDs (format: XX.XX.XX)
const controlPattern = /^(\d{2}\.\d{2}\.\d{2})\s+(.+?)$/gm;
const matches = [...content.matchAll(controlPattern)];

const controls = [];
const withdrawn = [];

matches.forEach(match => {
  const controlId = match[1];
  const title = match[2].trim();

  // Check if it's withdrawn
  if (title.toLowerCase() === 'withdrawn') {
    withdrawn.push(controlId);
  } else {
    controls.push({ id: controlId, title });
  }
});

console.log('Total controls found:', controls.length);
console.log('Withdrawn controls found:', withdrawn.length);
console.log('\nActive controls (excluding withdrawn):', controls.length);
console.log('\n=== Withdrawn Controls ===');
withdrawn.forEach(id => console.log(id));

console.log('\n=== Active Control IDs ===');
controls.forEach(c => console.log(c.id));

// Load current implementation
const data = require('./data/nist-improvement-actions.json');
const implementedIds = Object.keys(data.mappings).sort();

console.log('\n=== Comparison ===');
console.log('Controls in NIST doc (active):', controls.length);
console.log('Controls in your code:', implementedIds.length);

// Find missing controls
const controlIds = controls.map(c => c.id).sort();
const missing = controlIds.filter(id => !implementedIds.includes(id));
const extra = implementedIds.filter(id => !controlIds.includes(id));

if (missing.length > 0) {
  console.log('\n=== Missing from your code ===');
  missing.forEach(id => {
    const ctrl = controls.find(c => c.id === id);
    console.log(`${id}: ${ctrl.title}`);
  });
}

if (extra.length > 0) {
  console.log('\n=== Extra in your code (not in NIST doc) ===');
  extra.forEach(id => {
    console.log(id);
  });
}

if (missing.length === 0 && extra.length === 0) {
  console.log('\n✓ All controls match perfectly!');
}
