import { validationEngineService } from '../services/validationEngine.service';

console.log('='.repeat(80));
console.log('TESTING OBJECT SUBSET MATCHING');
console.log('='.repeat(80));
console.log('');

interface TestCase {
  name: string;
  actual: any;
  expected: any;
  shouldPass: boolean;
}

const testCases: TestCase[] = [
  {
    name: 'Exact match (same fields, same order)',
    actual: { isEnabled: true, type: 'hours', value: 8 },
    expected: { isEnabled: true, type: 'hours', value: 8 },
    shouldPass: true
  },
  {
    name: 'Different order (should still pass)',
    actual: { value: 8, type: 'hours', isEnabled: true },
    expected: { isEnabled: true, type: 'hours', value: 8 },
    shouldPass: true
  },
  {
    name: 'Extra fields in actual (real-world case)',
    actual: {
      value: 8,
      type: 'hours',
      authenticationType: 'primaryAndSecondaryAuthentication',
      frequencyInterval: 'timeBased',
      isEnabled: true
    },
    expected: { isEnabled: true, type: 'hours', value: 8 },
    shouldPass: true
  },
  {
    name: 'Missing required field',
    actual: { type: 'hours', value: 8 },
    expected: { isEnabled: true, type: 'hours', value: 8 },
    shouldPass: false
  },
  {
    name: 'Wrong value for required field',
    actual: { isEnabled: false, type: 'hours', value: 8 },
    expected: { isEnabled: true, type: 'hours', value: 8 },
    shouldPass: false
  },
  {
    name: 'Nested object matching',
    actual: {
      config: { enabled: true, timeout: 30 },
      extraField: 'ignored'
    },
    expected: {
      config: { enabled: true, timeout: 30 }
    },
    shouldPass: true
  },
  {
    name: 'Array exact match required',
    actual: { roles: ['user', 'admin', 'guest'] },
    expected: { roles: ['user', 'admin', 'guest'] },
    shouldPass: true
  },
  {
    name: 'Array different order (should fail)',
    actual: { roles: ['admin', 'user', 'guest'] },
    expected: { roles: ['user', 'admin', 'guest'] },
    shouldPass: false
  }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = validationEngineService.validate(
    testCase.actual,
    testCase.expected,
    '==',
    'object'
  );

  const testPassed = result.isValid === testCase.shouldPass;

  if (testPassed) {
    console.log(`✅ PASS: ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Got: ${result.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`   Error: ${result.errorMessage || 'none'}`);
    failed++;
  }
}

console.log('');
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log('');

if (failed === 0) {
  console.log('🎉 All tests passed! Object subset matching is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review implementation.');
  process.exit(1);
}
