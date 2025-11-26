/**
 * Revalidate BitLocker Policy Only
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor } from '../services/smart-extractor.service';

const prisma = new PrismaClient();

async function revalidateBitLocker() {
  console.log('\n' + '='.repeat(80));
  console.log('REVALIDATING BITLOCKER POLICY');
  console.log('='.repeat(80) + '\n');

  // Find BitLocker policy
  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('❌ No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Policy: ${policy.policyName}\n`);

  // Delete old compliance checks for this policy
  console.log('Step 1: Clearing old compliance checks...');
  const deleted = await prisma.settingComplianceCheck.deleteMany({
    where: { policyId: policy.id },
  });
  console.log(`  Deleted ${deleted.count} old checks\n`);

  // Get all settings that might apply to this policy
  const settings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { policyTemplate: policy.odataType },
        { templateFamily: policy.templateFamily },
      ],
    },
  });

  console.log(`Step 2: Validating ${settings.length} relevant settings...\n`);

  let extracted = 0;
  let compliant = 0;

  for (const setting of settings) {
    // Extract actual value from policy
    const extraction = await smartExtractor.extractValue(policy, setting);

    // Create compliance check
    await prisma.settingComplianceCheck.create({
      data: {
        policyId: policy.id,
        settingId: setting.id,
        actualValue: extraction.value !== null ? JSON.stringify(extraction.value) : null,
        expectedValue: setting.expectedValue,
        isCompliant:
          extraction.value !== null &&
          JSON.stringify(extraction.value) === setting.expectedValue,
        lastChecked: new Date(),
      },
    });

    if (extraction.value !== null) {
      extracted++;
      const isCompliant =
        JSON.stringify(extraction.value) === setting.expectedValue;
      if (isCompliant) compliant++;

      console.log(
        `${isCompliant ? '✅' : '❌'} ${setting.displayName.substring(0, 60)}`
      );
      console.log(`   Actual: ${JSON.stringify(extraction.value).substring(0, 80)}`);
      console.log(`   Expected: ${setting.expectedValue?.substring(0, 80)}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Extracted: ${extracted}/${settings.length} (${Math.round((extracted / settings.length) * 100)}%)`);
  console.log(`Compliant: ${compliant}/${extracted} (${extracted > 0 ? Math.round((compliant / extracted) * 100) : 0}%)`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

revalidateBitLocker();
