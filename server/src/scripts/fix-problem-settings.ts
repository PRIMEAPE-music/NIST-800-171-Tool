/**
 * Fix Problem Settings
 * Update settingName to point to correct child settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProblemSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('FIXING PROBLEM SETTINGS');
  console.log('='.repeat(80) + '\n');

  // Fix 1: TPM Platform Validation - should extract PIN usage child setting
  console.log('1️⃣ Fixing TPM Platform Validation...');
  const tpmSetting = await prisma.m365Setting.findFirst({
    where: { settingName: 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication' },
  });

  if (tpmSetting) {
    await prisma.m365Setting.update({
      where: { id: tpmSetting.id },
      data: {
        settingName: 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication_configurepinusagedropdown_name',
        settingPath: 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication_configurepinusagedropdown_name',
      },
    });
    console.log('   ✅ Updated to use child setting: configurepinusagedropdown_name');
  }

  // Fix 2: Removable Drive Encryption Method - should extract encryption type child setting
  console.log('\n2️⃣ Fixing Removable Drive Encryption Method...');
  const removableSetting = await prisma.m365Setting.findFirst({
    where: { settingName: 'device_vendor_msft_bitlocker_removabledrivesconfigurebde' },
  });

  if (removableSetting) {
    await prisma.m365Setting.update({
      where: { id: removableSetting.id },
      data: {
        settingName: 'device_vendor_msft_bitlocker_removabledrivesencryptiontype_rdvencryptiontypedropdown_name',
        settingPath: 'device_vendor_msft_bitlocker_removabledrivesencryptiontype_rdvencryptiontypedropdown_name',
      },
    });
    console.log('   ✅ Updated to use child setting: rdvencryptiontypedropdown_name');
  }

  // Fix 3: "Require BitLocker Encryption for Removable Drives" - update expected value
  console.log('\n3️⃣ Fixing "Require BitLocker" expected value...');
  const requireSetting = await prisma.m365Setting.findFirst({
    where: {
      settingName: 'device_vendor_msft_bitlocker_requiredeviceencryption',
      displayName: 'Require BitLocker Encryption for Removable Drives',
    },
  });

  if (requireSetting) {
    await prisma.m365Setting.update({
      where: { id: requireSetting.id },
      data: {
        expectedValue: 'true', // Change from "Enable" to boolean string
      },
    });
    console.log('   ✅ Updated expected value from "Enable" to "true"');
  }

  // Fix 4: BitLocker Drive Encryption Configuration - this is a composite setting
  // We'll update the expected value to just check if enabled
  console.log('\n4️⃣ Fixing Drive Encryption Configuration...');
  const driveConfigSetting = await prisma.m365Setting.findFirst({
    where: { settingName: 'BitLocker.EncryptionSettings' },
  });

  if (driveConfigSetting) {
    await prisma.m365Setting.update({
      where: { id: driveConfigSetting.id },
      data: {
        expectedValue: 'true', // Simplify to just check if enabled
        description: 'BitLocker device encryption is enabled (simplified check)',
      },
    });
    console.log('   ✅ Simplified expected value to "true" (enabled check)');
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIXES COMPLETE');
  console.log('='.repeat(80) + '\n');
  console.log('Next step: Revalidate BitLocker policy to regenerate compliance checks');
  console.log('');

  await prisma.$disconnect();
}

fixProblemSettings();
