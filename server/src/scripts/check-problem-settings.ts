/**
 * Check Problem Settings
 * Investigate TPM, Drive Config, and Removable Drive settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProblemSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATING PROBLEM SETTINGS');
  console.log('='.repeat(80) + '\n');

  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('❌ No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  const policyData = JSON.parse(policy.policyData);
  const flattened = policyData.flattenedSettings || [];

  console.log('=== TPM AUTHENTICATION SETTINGS ===\n');
  const tpmSettings = flattened.filter((s: any) =>
    s.settingDefinitionId.toLowerCase().includes('startupauthentication') ||
    s.settingDefinitionId.toLowerCase().includes('tpm')
  );
  tpmSettings.forEach((s: any) => {
    console.log(`ID: ${s.settingDefinitionId}`);
    console.log(`Value: ${s.value}`);
    console.log(`Type: ${s.type}`);
    console.log(`ParentId: ${s.parentId || '(root)'}`);
    console.log('');
  });

  console.log('\n=== REMOVABLE DRIVE SETTINGS ===\n');
  const removableSettings = flattened.filter((s: any) =>
    s.settingDefinitionId.toLowerCase().includes('removable')
  );
  removableSettings.forEach((s: any) => {
    console.log(`ID: ${s.settingDefinitionId}`);
    console.log(`Value: ${s.value}`);
    console.log(`Type: ${s.type}`);
    console.log(`ParentId: ${s.parentId || '(root)'}`);
    console.log('');
  });

  console.log('\n=== ENCRYPTION METHOD SETTINGS (ALL) ===\n');
  const encryptionSettings = flattened.filter((s: any) =>
    s.settingDefinitionId.toLowerCase().includes('encryption')
  );
  console.log(`Found ${encryptionSettings.length} encryption-related settings:\n`);
  encryptionSettings.forEach((s: any) => {
    const shortId = s.settingDefinitionId.split('_').slice(-4).join('_');
    console.log(`[${s.depth}] ${shortId}`);
    console.log(`    Value: ${s.value}`);
    console.log(`    Parent: ${s.parentId ? s.parentId.split('_').slice(-2).join('_') : '(root)'}`);
  });

  console.log('\n=== CHECKING ACTUAL COMPLIANCE CHECKS ===\n');
  const problemSettings = [
    'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication',
    'BitLocker.EncryptionSettings',
    'device_vendor_msft_bitlocker_removabledrivesconfigurebde',
    'device_vendor_msft_bitlocker_requiredeviceencryption',
  ];

  for (const settingName of problemSettings) {
    const setting = await prisma.m365Setting.findFirst({
      where: { settingName },
    });

    if (setting) {
      const check = await prisma.settingComplianceCheck.findFirst({
        where: {
          policyId: policy.id,
          settingId: setting.id,
        },
      });

      console.log(`📋 ${setting.displayName}`);
      console.log(`   settingName: ${setting.settingName}`);
      console.log(`   settingPath: ${setting.settingPath}`);
      if (check) {
        console.log(`   actualValue: ${check.actualValue}`);
        console.log(`   expectedValue: ${check.expectedValue}`);
        console.log(`   compliant: ${check.isCompliant ? '✅' : '❌'}`);
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
}

checkProblemSettings();
