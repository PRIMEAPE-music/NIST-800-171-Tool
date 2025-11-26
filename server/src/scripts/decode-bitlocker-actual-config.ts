/**
 * Decode BitLocker Actual Configuration
 *
 * Shows what _1 actually means for each BitLocker setting
 */

import { settingsCatalogDefinitionService } from '../services/settings-catalog-definition.service';

const BITLOCKER_SETTINGS = [
  {
    id: 'device_vendor_msft_bitlocker_requiredeviceencryption',
    value: 'device_vendor_msft_bitlocker_requiredeviceencryption_1',
    friendlyName: 'Require Device Encryption',
  },
  {
    id: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype',
    value: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_1',
    friendlyName: 'System Drive Encryption Type',
  },
  {
    id: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype',
    value: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype_1',
    friendlyName: 'Fixed Drive Encryption Type',
  },
  {
    id: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype',
    value: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_1',
    friendlyName: 'Encryption Method By Drive Type',
  },
  {
    id: 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength',
    value: 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength_1',
    friendlyName: 'System Drive Minimum PIN Length',
  },
  {
    id: 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication',
    value: 'device_vendor_msft_bitlocker_systemdrivesrequirestartupauthentication_1',
    friendlyName: 'System Drive Require Startup Authentication',
  },
  {
    id: 'device_vendor_msft_bitlocker_removabledrivesconfigurebde',
    value: 'device_vendor_msft_bitlocker_removabledrivesconfigurebde_1',
    friendlyName: 'Removable Drives Configure BDE',
  },
  {
    id: 'device_vendor_msft_bitlocker_fixeddrivesrecoveryoptions',
    value: 'device_vendor_msft_bitlocker_fixeddrivesrecoveryoptions_1',
    friendlyName: 'Fixed Drives Recovery Options',
  },
  {
    id: 'device_vendor_msft_bitlocker_removabledrivesrequireencryption',
    value: 'device_vendor_msft_bitlocker_removabledrivesrequireencryption_1',
    friendlyName: 'Removable Drives Require Encryption',
  },
];

async function decodeBitLockerActualConfig() {
  console.log('\n' + '='.repeat(80));
  console.log('BITLOCKER ACTUAL CONFIGURATION (Decoded)');
  console.log('='.repeat(80) + '\n');

  console.log('Fetching and decoding settings from Microsoft Graph API...\n');

  for (const setting of BITLOCKER_SETTINGS) {
    try {
      console.log(`\n📋 ${setting.friendlyName}`);
      console.log(`   Setting ID: ${setting.id}`);
      console.log(`   Raw Value: ${setting.value}`);

      const decoded = await settingsCatalogDefinitionService.decodeValue(
        setting.id,
        setting.value
      );

      if (decoded) {
        console.log(`   ✅ Decoded Value: ${decoded.value}`);
        if (decoded.displayName) {
          console.log(`   📝 Display Name: ${decoded.displayName}`);
        }
        if (decoded.description) {
          console.log(`   ℹ️  Description: ${decoded.description}`);
        }
      } else {
        console.log(`   ❌ Could not decode (definition not found or API error)`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('\nThis shows you exactly what your BitLocker policy is configured with.');
  console.log('If any settings show just "Enabled" without specifics, it means:');
  console.log('  - The setting is turned on');
  console.log('  - But the actual encryption method/PIN length/etc. may be using defaults');
  console.log('  - Or those details are in separate child settings not captured here\n');
}

decodeBitLockerActualConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
