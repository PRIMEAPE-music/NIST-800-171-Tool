const data = require('./data/control-settings-mappings.json');

console.log('\n🔍 Validating Settings Mappings File\n');
console.log('='.repeat(60));

// Test 1: Basic structure
console.log('\n✓ Test 1: Basic Structure');
console.log(`  Version: ${data.version}`);
console.log(`  Strategy: ${data.mappingStrategy}`);
console.log(`  Total Controls: ${data.controls.length}`);

// Test 2: First control structure
const firstControl = data.controls[0];
console.log('\n✓ Test 2: First Control Structure');
console.log(`  Control ID: ${firstControl.controlId}`);
console.log(`  Title: ${firstControl.controlTitle}`);
console.log(`  Priority: ${firstControl.priority}`);
console.log(`  Mappings: ${firstControl.settingsMappings.length}`);

// Test 3: First mapping structure
const firstMapping = firstControl.settingsMappings[0];
console.log('\n✓ Test 3: First Mapping Structure');
console.log(`  ID: ${firstMapping.id}`);
console.log(`  Description: ${firstMapping.description}`);
console.log(`  Policy Types: ${firstMapping.policyTypes.join(', ')}`);
console.log(`  Has searchStrategy: ${!!firstMapping.searchStrategy}`);
console.log(`  Has validation: ${!!firstMapping.validation}`);
console.log(`  Has compliance: ${!!firstMapping.compliance}`);

// Test 4: Search strategy details
console.log('\n✓ Test 4: Search Strategy');
console.log(`  Mode: ${firstMapping.searchStrategy.mode}`);
console.log(`  Keywords: ${firstMapping.searchStrategy.settingNameKeywords.join(', ')}`);
if (firstMapping.searchStrategy.excludeKeywords) {
  console.log(`  Exclude: ${firstMapping.searchStrategy.excludeKeywords.join(', ')}`);
}

// Test 5: Validation details
console.log('\n✓ Test 5: Validation');
console.log(`  Expected Value: ${firstMapping.validation.expectedValue}`);
console.log(`  Operator: ${firstMapping.validation.operator}`);
console.log(`  Data Type: ${firstMapping.validation.dataType}`);

// Test 6: Compliance details
console.log('\n✓ Test 6: Compliance');
console.log(`  Confidence: ${firstMapping.compliance.confidence}`);
console.log(`  NIST Requirement: ${firstMapping.compliance.nistRequirement}`);

// Test 7: Validate all mappings have required fields
console.log('\n✓ Test 7: Required Fields Check');
let hasErrors = false;
let totalMappings = 0;

data.controls.forEach((ctrl) => {
  if (!ctrl.settingsMappings || ctrl.settingsMappings.length === 0) {
    console.log(`  ❌ No mappings for ${ctrl.controlId}`);
    hasErrors = true;
  } else {
    ctrl.settingsMappings.forEach((mapping) => {
      totalMappings++;
      if (!mapping.searchStrategy || !mapping.validation || !mapping.compliance) {
        console.log(`  ❌ Missing required fields in ${ctrl.controlId} mapping ${mapping.id}`);
        hasErrors = true;
      }
    });
  }
});

if (!hasErrors) {
  console.log(`  ✅ All ${totalMappings} mappings have required fields`);
}

// Test 8: Priority distribution
console.log('\n✓ Test 8: Priority Distribution');
const priorityCounts = {
  Critical: 0,
  High: 0,
  Medium: 0,
  Low: 0
};

data.controls.forEach((ctrl) => {
  priorityCounts[ctrl.priority]++;
});

console.log(`  Critical: ${priorityCounts.Critical}`);
console.log(`  High: ${priorityCounts.High}`);
console.log(`  Medium: ${priorityCounts.Medium}`);
console.log(`  Low: ${priorityCounts.Low}`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Validation Complete!\n');
