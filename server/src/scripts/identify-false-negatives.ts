import { PrismaClient } from '@prisma/client';
import { validationEngineService } from '../services/validationEngine.service';

const prisma = new PrismaClient();

async function identifyFalseNegatives() {
  console.log('='.repeat(80));
  console.log('IDENTIFYING FALSE-NEGATIVE VALIDATION FAILURES');
  console.log('='.repeat(80));
  console.log('');

  // Get compliance checks with object validation that failed
  const failedChecks = await prisma.settingComplianceCheck.findMany({
    where: {
      isCompliant: false,
      actualValue: { not: null }
    },
    include: {
      policy: { select: { policyName: true } },
      setting: {
        select: {
          displayName: true,
          expectedValue: true,
          dataType: true,
          validationOperator: true
        }
      }
    },
    take: 50
  });

  console.log(`Found ${failedChecks.length} failed compliance checks with actual values\n`);

  let objectTypeCount = 0;
  let potentialFixes = 0;

  for (const check of failedChecks) {
    if (check.setting.dataType === 'object' && check.setting.validationOperator === '==') {
      objectTypeCount++;

      try {
        const actual = JSON.parse(check.actualValue || '{}');
        const expected = JSON.parse(check.setting.expectedValue || '{}');

        // Test with new validation logic
        const result = validationEngineService.validate(
          actual,
          expected,
          '==',
          'object'
        );

        if (result.isValid) {
          potentialFixes++;
          console.log(`📌 POTENTIAL FIX FOUND:`);
          console.log(`   Policy: ${check.policy.policyName}`);
          console.log(`   Setting: ${check.setting.displayName}`);
          console.log(`   Expected: ${check.setting.expectedValue?.substring(0, 80)}...`);
          console.log(`   Actual: ${check.actualValue?.substring(0, 80)}...`);
          console.log(`   OLD Status: ❌ Non-compliant`);
          console.log(`   NEW Status: ✅ Compliant (would be fixed)`);
          console.log('---\n');
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Total failed checks: ${failedChecks.length}`);
  console.log(`   Object type failures with == operator: ${objectTypeCount}`);
  console.log(`   Potential false-negatives that would be FIXED: ${potentialFixes}`);
  console.log('');

  if (potentialFixes > 0) {
    console.log(`✨ SUCCESS! ${potentialFixes} compliance checks will now pass with subset matching!`);
  } else {
    console.log(`ℹ️  No false-negatives detected in current dataset.`);
  }

  await prisma.$disconnect();
}

identifyFalseNegatives().catch(console.error);
