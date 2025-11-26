/**
 * Diagnose BitLocker Settings Extraction Issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseBitLocker() {
  console.log('\n' + '='.repeat(80));
  console.log('BITLOCKER SETTINGS DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');

  // Get the BitLocker policy
  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Policy: ${policy.policyName}\n`);

  // Parse policy data
  const policyData = JSON.parse(policy.policyData);

  console.log('ACTUAL SETTINGS IN POLICY:');
  console.log('-'.repeat(80) + '\n');

  const actualSettings = new Map<string, any>();

  if (policyData.settings) {
    policyData.settings.forEach((setting: any, i: number) => {
      const defId = setting.settingInstance?.settingDefinitionId;
      let value = null;
      let type = 'unknown';

      if (setting.settingInstance?.choiceSettingValue) {
        value = setting.settingInstance.choiceSettingValue.value;
        type = 'choice';
      } else if (setting.settingInstance?.simpleSettingValue) {
        value = setting.settingInstance.simpleSettingValue.value;
        type = 'simple';
      } else if (setting.settingInstance?.groupSettingCollectionValue) {
        type = 'groupCollection';
        value = `[${setting.settingInstance.groupSettingCollectionValue.length} items]`;
      }

      if (defId) {
        actualSettings.set(defId.toLowerCase(), { defId, value, type, index: i });
        console.log(`[${i}] ${defId}`);
        console.log(`    Type: ${type}`);
        console.log(`    Value: ${value}`);
        console.log('');
      }
    });
  }

  console.log(`\nTotal settings in policy: ${actualSettings.size}\n`);

  // Get compliance checks
  console.log('='.repeat(80));
  console.log('MAPPED SETTINGS & EXTRACTION RESULTS:');
  console.log('-'.repeat(80) + '\n');

  const complianceChecks = await prisma.settingComplianceCheck.findMany({
    where: { policyId: policy.id },
    include: { setting: true },
    orderBy: { setting: { displayName: 'asc' } },
  });

  console.log(`Found ${complianceChecks.length} compliance checks\n`);

  let notDecodedCount = 0;
  let notFoundCount = 0;
  let mismatchCount = 0;

  for (const check of complianceChecks) {
    const setting = check.setting;
    console.log(`Setting: ${setting.displayName}`);
    console.log(`  settingName: ${setting.settingName || '(null)'}`);
    console.log(`  settingPath: ${setting.settingPath}`);
    console.log(`  Expected: ${check.expectedValue}`);
    console.log(`  Actual: ${check.actualValue || '(null)'}`);
    console.log(`  Compliant: ${check.isCompliant ? 'YES' : 'NO'}`);

    // Check if actual value is still a reference (not decoded)
    if (check.actualValue && check.actualValue.includes('device_vendor_msft_')) {
      console.log(`  WARNING: Not decoded (still showing reference)`);
      notDecodedCount++;
    }

    // Check if settingName matches any actual setting in policy
    const searchKey = setting.settingName?.toLowerCase();
    if (searchKey && actualSettings.has(searchKey)) {
      const actual = actualSettings.get(searchKey);
      console.log(`  Found in policy: ${actual.defId} = ${actual.value}`);

      if (actual.value !== check.actualValue) {
        console.log(`  MISMATCH: DB has ${check.actualValue}, policy has ${actual.value}`);
        mismatchCount++;
      }
    } else {
      console.log(`  NOT FOUND in policy (settingName may be wrong)`);
      notFoundCount++;
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY:');
  console.log('-'.repeat(80));
  console.log(`Settings not decoded: ${notDecodedCount}`);
  console.log(`Settings not found in policy: ${notFoundCount}`);
  console.log(`Value mismatches: ${mismatchCount}`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

diagnoseBitLocker().catch(console.error);
