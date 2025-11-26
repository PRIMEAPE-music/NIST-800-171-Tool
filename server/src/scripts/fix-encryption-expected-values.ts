/**
 * Fix Expected Values for Encryption Type Settings
 *
 * Updates expectedValue and settingPath to match decoded child values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEncryptionExpectedValues() {
  console.log('\n' + '='.repeat(80));
  console.log('FIX ENCRYPTION TYPE EXPECTED VALUES');
  console.log('='.repeat(80) + '\n');

  let updateCount = 0;

  // Fix: Encryption TYPE settings (Full vs Used Space encryption)
  // These decode to "Full encryption" not "1"
  const typeSettings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { settingName: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_osencryptiontypedropdown_name' },
        { settingName: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype_fdvencryptiontypedropdown_name' },
      ],
    },
  });

  console.log(`Found ${typeSettings.length} encryption TYPE settings to update\n`);

  for (const setting of typeSettings) {
    console.log(`📋 ${setting.displayName}`);
    console.log(`   Current settingPath: ${setting.settingPath}`);
    console.log(`   Current expectedValue: ${setting.expectedValue}`);

    // Update both settingPath and expectedValue
    await prisma.m365Setting.update({
      where: { id: setting.id },
      data: {
        settingPath: setting.settingName, // Match settingPath to settingName
        expectedValue: 'Full encryption', // Update to decoded value
      },
    });

    console.log(`   ✅ Updated settingPath to: ${setting.settingName}`);
    console.log(`   ✅ Updated expectedValue to: Full encryption\n`);
    updateCount++;
  }

  console.log('='.repeat(80));
  console.log(`Updated ${updateCount} settings`);
  console.log('='.repeat(80) + '\n');

  console.log('Next step: Run validation to verify all settings extract correctly\n');

  await prisma.$disconnect();
}

fixEncryptionExpectedValues();
