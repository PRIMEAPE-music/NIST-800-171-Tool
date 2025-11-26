/**
 * Check BitLocker Policy Validation Results
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBitLockerValidationResults() {
  console.log('\n' + '='.repeat(80));
  console.log('BITLOCKER POLICY VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('❌ No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Policy: ${policy.policyName}\n`);

  // Get all compliance checks for this policy
  const checks = await prisma.settingComplianceCheck.findMany({
    where: { policyId: policy.id },
    include: {
      setting: {
        select: {
          id: true,
          displayName: true,
          settingName: true,
          controlMappings: {
            select: {
              id: true,
              confidence: true,
              control: {
                select: {
                  controlId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const withActualValue = checks.filter((c) => c.actualValue && c.actualValue !== 'null');
  const withMappings = checks.filter((c) => c.setting.controlMappings.length > 0);
  const compliant = checks.filter((c) => c.isCompliant);
  const nonCompliant = checks.filter(
    (c) => !c.isCompliant && c.actualValue && c.actualValue !== 'null'
  );

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total compliance checks: ${checks.length}`);
  console.log(`Checks with values extracted: ${withActualValue.length} (${Math.round((withActualValue.length / checks.length) * 100)}%)`);
  console.log(`Settings with control mappings: ${withMappings.length}`);
  console.log(`Compliant: ${compliant.length}`);
  console.log(`Non-compliant: ${nonCompliant.length}`);
  console.log('='.repeat(80) + '\n');

  // Show settings with extracted values
  if (withActualValue.length > 0) {
    console.log('Settings with extracted values:\n');
    withActualValue.slice(0, 15).forEach((check, i) => {
      console.log(`[${i}] ${check.setting.displayName}`);
      console.log(`    settingName: ${check.setting.settingName}`);
      console.log(`    actualValue: ${check.actualValue}`);
      console.log(`    expectedValue: ${check.expectedValue}`);
      console.log(`    compliant: ${check.isCompliant ? '✅' : '❌'}`);
      console.log(`    mappings: ${check.setting.controlMappings.length}`);
      console.log('');
    });

    if (withActualValue.length > 15) {
      console.log(`... and ${withActualValue.length - 15} more\n`);
    }
  }

  // Compare with previous state (24 relevant settings, 100% extraction)
  console.log('='.repeat(80));
  console.log('COMPARISON WITH PREVIOUS STATE');
  console.log('='.repeat(80));
  console.log('Previous state:');
  console.log('  - 24 relevant settings');
  console.log('  - 24/24 extracted (100%)');
  console.log('  - 3/24 compliant (12.5%)\n');
  console.log('Current state:');
  console.log(`  - ${checks.length} compliance checks`);
  console.log(`  - ${withActualValue.length}/${checks.length} extracted (${Math.round((withActualValue.length / checks.length) * 100)}%)`);
  console.log(`  - ${compliant.length}/${withActualValue.length} compliant (${withActualValue.length > 0 ? Math.round((compliant.length / withActualValue.length) * 100) : 0}%)`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkBitLockerValidationResults();
