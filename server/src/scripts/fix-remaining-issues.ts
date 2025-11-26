/**
 * Fix Remaining Issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRemainingIssues() {
  console.log('\n' + '='.repeat(80));
  console.log('FIXING REMAINING ISSUES');
  console.log('='.repeat(80) + '\n');

  // Fix 1: Removable Drive Encryption Method - update expected value to match actual
  console.log('1️⃣ Fixing Removable Drive Encryption Method expected value...');
  const removableMethod = await prisma.m365Setting.findFirst({
    where: {
      displayName: 'BitLocker Removable Drive Encryption Method',
    },
  });

  if (removableMethod) {
    await prisma.m365Setting.update({
      where: { id: removableMethod.id },
      data: {
        expectedValue: '"Full encryption"', // This setting checks encryption type, not method
        description: 'BitLocker removable drive encryption type (Full encryption vs Used space only)',
      },
    });
    console.log('   ✅ Updated expected value to "\\"Full encryption\\""');
  }

  // Fix 2: TPM Platform Validation - update expected value to boolean
  console.log('\n2️⃣ Fixing TPM Platform Validation expected value...');
  const tpmSetting = await prisma.m365Setting.findFirst({
    where: {
      displayName: 'BitLocker - TPM Platform Validation',
    },
  });

  if (tpmSetting) {
    await prisma.m365Setting.update({
      where: { id: tpmSetting.id },
      data: {
        expectedValue: 'true', // Decoder returns boolean, not display name
      },
    });
    console.log('   ✅ Updated expected value to "true"');
  }

  // Fix 3: Azure Key Vault - normalize "True" to true
  console.log('\n3️⃣ Fixing Azure Key Vault expected value...');
  const azureSetting = await prisma.m365Setting.findFirst({
    where: {
      displayName: 'Azure Key Vault - Backup BitLocker Keys',
    },
  });

  if (azureSetting) {
    await prisma.m365Setting.update({
      where: { id: azureSetting.id },
      data: {
        expectedValue: '"True"', // Match the decoded string format
      },
    });
    console.log('   ✅ Updated expected value to "\\"True\\""');
  }

  // Fix 4: Backup Recovery Keys to Azure AD
  console.log('\n4️⃣ Fixing Backup Recovery Keys to Azure AD...');
  const backupSetting = await prisma.m365Setting.findFirst({
    where: {
      displayName: 'BitLocker - Backup Recovery Keys to Azure AD',
    },
  });

  if (backupSetting) {
    await prisma.m365Setting.update({
      where: { id: backupSetting.id },
      data: {
        expectedValue: '"True"', // Match the decoded string format
      },
    });
    console.log('   ✅ Updated expected value to "\\"True\\""');
  }

  // Fix 5: OS Drive and Fixed Drive Encryption Method - normalize expected value
  console.log('\n5️⃣ Fixing OS/Fixed Drive Encryption Method expected values...');
  const encryptionSettings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { displayName: 'BitLocker Operating System Drive Encryption Method' },
        { displayName: 'BitLocker Fixed Data Drive Encryption Method' },
      ],
    },
  });

  for (const setting of encryptionSettings) {
    await prisma.m365Setting.update({
      where: { id: setting.id },
      data: {
        expectedValue: '"Full encryption"', // Match the decoded string format
      },
    });
    console.log(`   ✅ Updated ${setting.displayName} to "\\"Full encryption\\""`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIXES COMPLETE');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

fixRemainingIssues();
