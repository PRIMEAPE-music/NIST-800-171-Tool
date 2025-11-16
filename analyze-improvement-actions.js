const data = require('./data/nist-improvement-actions.json');

const controlIds = Object.keys(data.mappings);
console.log('Total control mappings:', controlIds.length);

// Count total action mappings
let totalActionMappings = 0;
const allActionIds = [];

controlIds.forEach(controlId => {
  const control = data.mappings[controlId];
  const actionCount = control.improvementActions ? control.improvementActions.length : 0;
  totalActionMappings += actionCount;
  
  if (control.improvementActions) {
    control.improvementActions.forEach(action => {
      if (action.actionId) {
        allActionIds.push(action.actionId);
      }
    });
  }
});

// Count unique actions
const uniqueActionIds = [...new Set(allActionIds)];

console.log('\nTotal action mappings (across all controls):', totalActionMappings);
console.log('Unique improvement actions:', uniqueActionIds.length);
console.log('Actions mapped to multiple controls:', totalActionMappings - uniqueActionIds.length);

console.log('\nExpected per Phase 4 docs:');
console.log('- Controls: 97');
console.log('- Unique actions: 169');
console.log('- Total mappings: 196');

console.log('\nActual in current file:');
console.log('- Controls:', controlIds.length);
console.log('- Unique actions:', uniqueActionIds.length);
console.log('- Total mappings:', totalActionMappings);
