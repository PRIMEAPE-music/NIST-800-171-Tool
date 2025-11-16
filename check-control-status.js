const data = require('./data/nist-800-171-controls.json');

console.log('Total controls in file:', data.controls.length);

// Check if there's a status field
const hasStatus = data.controls.some(c => c.hasOwnProperty('status'));
console.log('Has status field:', hasStatus);

// Check first few controls
console.log('\nFirst 5 controls:');
data.controls.slice(0, 5).forEach(c => {
  console.log(`  ${c.controlId} [${c.family}]: ${c.title}`);
  console.log(`    Status: ${c.status || 'N/A'}, Priority: ${c.priority || 'N/A'}`);
});

// Check if there are any withdrawn or inactive controls
const statuses = {};
data.controls.forEach(c => {
  const status = c.status || 'Unknown';
  statuses[status] = (statuses[status] || 0) + 1;
});

console.log('\nControls by status:');
Object.keys(statuses).forEach(s => console.log('  ' + s + ':', statuses[s]));
