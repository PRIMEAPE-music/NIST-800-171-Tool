/**
 * Fix BitLocker Setting Names
 *
 * Updates settingName fields to match actual definition IDs in the BitLocker policy
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of display names (or keywords) to actual definition IDs in the policy
const BITLOCKER_MAPPING: Record<string, string> = {
  // Device encryption requirement
  'Require Encryption': 'device_vendor_msft_bitlocker_requiredeviceencryption',
  'Require BitLocker': 'device_vendor_msft_bitlocker_requiredeviceencryption',
  'Device Encryption': 'device_vendor_msft_bitlocker_requiredeviceencryption',

  // OS Drive encryption type
  'Operating System Drive Encryption Method': 'device_vendor_msft_bitlocker_systemdrivesencryptiontype',
  'OS Drive Encryption': 'device_vendor_msft_bitlocker_systemdrivesencryptiontype',

  // Fixed drive encryption type
  'Fixed Data Drive Encryption Method': 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype',
  'Fixed Drive Encryption': 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype',

  // Fixed drive recovery options
  'Fixed Data Drive': 'device_vendor_msft_bitlocker_fixeddrivesrecoveryoptions',

  // Startup authentication
  'Operating System Drive Encryption Policy': 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication',
  'TPM': 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication',
  'Startup': 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication',

  // Minimum PIN length
  'PIN': 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength',

  // Removable drive configuration
  'Removable Drive Encryption Enforcement': 'device_vendor_msft_bitlocker_removabledrivesconfigurebde',
  'Removable Drive': 'device_vendor_msft_bitlocker_removabledrivesconfigurebde',

  // Encryption method by drive type
  'Encryption Cipher': 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype',
  'Cipher Strength': 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype',

  // Removable drives require encryption
  'Removable Drives': 'device_vendor_msft_bitlocker_removabledrivesrequireencryption',
};

async function fixBitLockerSettingNames() {
  console.log('\n' + '='.repeat(80));
  console.log('FIX BITLOCKER SETTING NAMES');
  console.log('='.repeat(80) + '\n');

  // Get all BitLocker-related settings
  const settings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { displayName: { contains: 'BitLocker' } },
        { displayName: { contains: 'Encryption' } },
        { settingPath: { contains: 'bitlocker' } },
        { templateFamily: 'DiskEncryption' },
      ],
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Found ${settings.length} BitLocker-related settings\n`);

  let updateCount = 0;

  for (const setting of settings) {
    // Try to find a matching definition ID
    let matchedDefId: string | null = null;

    // Check each mapping rule
    for (const [keyword, defId] of Object.entries(BITLOCKER_MAPPING)) {
      if (setting.displayName.includes(keyword)) {
        matchedDefId = defId;
        break;
      }
    }

    if (matchedDefId && matchedDefId !== setting.settingName) {
      console.log(`Updating: ${setting.displayName}`);
      console.log(`  Old settingName: ${setting.settingName || '(null)'}`);
      console.log(`  New settingName: ${matchedDefId}`);

      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: { settingName: matchedDefId },
      });

      updateCount++;
      console.log('  ✅ Updated\n');
    }
  }

  console.log('='.repeat(80));
  console.log(`Updated ${updateCount} settings`);
  console.log('='.repeat(80) + '\n');

  console.log('Next step: Run the validation script to re-extract values with correct settings');
  console.log('  npx tsx src/scripts/revalidate-all.ts\n');

  await prisma.$disconnect();
}

fixBitLockerSettingNames().catch(console.error);
