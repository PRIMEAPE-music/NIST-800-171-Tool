import { PrismaClient } from '@prisma/client';
import { validationEngineService } from '../services/validationEngine.service';

const prisma = new PrismaClient();

async function testSigninFrequency() {
  console.log('='.repeat(80));
  console.log('TESTING SIGN-IN FREQUENCY POLICY');
  console.log('='.repeat(80));
  console.log('');

  // Find the Sign-in Frequency policy
  const policy = await prisma.m365Policy.findFirst({
    where: {
      policyName: { contains: 'Sign-in frequency' }
    }
  });

  if (!policy) {
    console.log('❌ Sign-in Frequency policy not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found policy: ${policy.policyName}`);
  console.log(`Policy ID: ${policy.id}`);
  console.log('');

  // Find related compliance checks
  const checks = await prisma.settingComplianceCheck.findMany({
    where: { policyId: policy.id },
    include: {
      setting: {
        select: {
          displayName: true,
          expectedValue: true,
          valueType: true
        }
      }
    }
  });

  console.log(`Found ${checks.length} compliance checks for this policy\n`);

  for (const check of checks) {
    if (check.setting.valueType === 'object' && check.actualValue) {
      console.log(`Setting: ${check.setting.displayName}`);
      console.log(`Value Type: object`);

      // Parse values
      const actual = JSON.parse(check.actualValue);
      const expected = JSON.parse(check.setting.expectedValue || '{}');

      console.log(`Expected: ${JSON.stringify(expected)}`);
      console.log(`Actual: ${JSON.stringify(actual).substring(0, 150)}...`);

      // Test with new validation logic
      const result = validationEngineService.validate(
        actual,
        expected,
        '==',
        'object'
      );

      console.log(`OLD Status: ${check.isCompliant ? '✅ Compliant' : '❌ Non-compliant'}`);
      console.log(`NEW Status: ${result.isValid ? '✅ Compliant' : '❌ Non-compliant'}`);

      if (check.isCompliant !== result.isValid) {
        console.log(`🔄 Status CHANGED: ${check.isCompliant ? 'Compliant' : 'Non-compliant'} → ${result.isValid ? 'Compliant' : 'Non-compliant'}`);
      }

      console.log('---\n');
    }
  }

  await prisma.$disconnect();
}

testSigninFrequency().catch(console.error);
