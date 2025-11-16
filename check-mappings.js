const data = require('./data/nist-improvement-actions.json');

const controlIds = Object.keys(data.mappings);

console.log('Total control IDs in mappings:', controlIds.length);

const withUnderscore = controlIds.filter(id => id.includes('_'));
console.log('\nControls with underscore suffix:', withUnderscore.length);
if (withUnderscore.length > 0) {
  console.log('Examples:', withUnderscore.slice(0, 15).join(', '));
}

const baseIds = controlIds.map(id => id.split('_')[0]);
const duplicates = baseIds.filter((id, index) => baseIds.indexOf(id) !== index);
const uniqueDuplicates = [...new Set(duplicates)];

console.log('\nDuplicate base IDs:', uniqueDuplicates.length);
if (uniqueDuplicates.length > 0) {
  console.log('Duplicates:', uniqueDuplicates.join(', '));

  // Show the duplicates with their families
  console.log('\nDuplicate details:');
  uniqueDuplicates.slice(0, 5).forEach(baseId => {
    const matches = controlIds.filter(id => id.startsWith(baseId));
    console.log(`  ${baseId}:`, matches.join(', '));
  });
}

// Count controls without underscore
const withoutUnderscore = controlIds.filter(id => !id.includes('_'));
console.log('\nControls without underscore:', withoutUnderscore.length);
console.log('This should be 97 for Rev 3');
