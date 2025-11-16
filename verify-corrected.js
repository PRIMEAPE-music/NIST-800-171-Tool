const data = require('./data/nist-improvement-actions.json');

console.log('=== FILE METADATA ===');
console.log('Version:', data.version);
console.log('Revision:', data.revision);
console.log('Total Controls (metadata):', data.totalControls);
console.log('Total Actions (metadata):', data.totalActions);
console.log('Total Mappings (metadata):', data.totalMappings);

console.log('\n=== ACTUAL COUNTS ===');
const controlIds = Object.keys(data.mappings);
console.log('Control IDs in mappings:', controlIds.length);

// Check for underscores
const withUnderscore = controlIds.filter(id => id.includes('_'));
console.log('Controls with underscore:', withUnderscore.length);
if (withUnderscore.length > 0) {
  console.log('Examples:', withUnderscore.slice(0, 10).join(', '));
}

// Count unique actions
let totalMappings = 0;
const allActionIds = [];

controlIds.forEach(controlId => {
  const control = data.mappings[controlId];
  if (control.improvementActions) {
    totalMappings += control.improvementActions.length;
    control.improvementActions.forEach(action => {
      if (action.actionId) {
        allActionIds.push(action.actionId);
      }
    });
  }
});

const uniqueActionIds = [...new Set(allActionIds)];

console.log('Unique improvement actions:', uniqueActionIds.length);
console.log('Total action mappings:', totalMappings);

console.log('\n=== COMPARISON ===');
console.log('Controls - Expected: 97, Actual:', controlIds.length);
console.log('Actions - Expected: 141, Actual:', uniqueActionIds.length);
console.log('Mappings - Expected: 194, Actual:', totalMappings);
