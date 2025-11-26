/**
 * Test Enhanced Extraction with Flattened Settings
 *
 * Verifies that the extractor now uses flattenedSettings and can find child settings
 */

import { PrismaClient } from '@prisma/client';
import { extractSettingsCatalog, matchSettingsCatalog } from '../services/settings-catalog-extractor.service';

const prisma = new PrismaClient();

async function testEnhancedExtraction() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST ENHANCED EXTRACTION WITH FLATTENED SETTINGS');
  console.log('='.repeat(80) + '\n');

  try {
    // Get BitLocker policy
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Policy: ${policy.policyName}\n`);

    const policyData = JSON.parse(policy.policyData);

    // Test the extraction function
    console.log('Running extractSettingsCatalog()...\n');
    const catalogData = extractSettingsCatalog(policyData);

    console.log('='.repeat(80));
    console.log(`EXTRACTED ${catalogData.size} SETTINGS`);
    console.log('='.repeat(80) + '\n');

    // Test finding specific child settings
    const testSettings = [
      {
        displayName: 'BitLocker Encryption Method - OS Drive',
        settingName: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsosdropdown_name',
        settingPath: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsosdropdown_name'
      },
      {
        displayName: 'BitLocker Encryption Method - Fixed Drive',
        settingName: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsfdvdropdown_name',
        settingPath: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsfdvdropdown_name'
      },
      {
        displayName: 'BitLocker Minimum PIN Length',
        settingName: 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength_minpinlength',
        settingPath: 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength_minpinlength'
      },
      {
        displayName: 'BitLocker OS Drive Encryption Type',
        settingName: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_osencryptiontypedropdown_name',
        settingPath: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_osencryptiontypedropdown_name'
      },
    ];

    console.log('Testing extraction of child settings:\n');

    for (const testSetting of testSettings) {
      console.log(`📋 ${testSetting.displayName}`);
      console.log(`   Looking for: ${testSetting.settingName}`);

      const match = matchSettingsCatalog(testSetting, catalogData);

      if (match) {
        console.log(`   ✅ FOUND!`);
        console.log(`   Definition ID: ${match.definitionId}`);
        console.log(`   Value: ${match.value}`);
        console.log(`   Type: ${match.type}`);
      } else {
        console.log(`   ❌ NOT FOUND`);
      }
      console.log('');
    }

    // Show summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const childSettings = Array.from(catalogData.entries()).filter(
      ([id]) =>
        id.includes('encryptionmethod') ||
        id.includes('minpinlength') ||
        id.includes('osencryptiontype') ||
        id.includes('fdvencryptiontype')
    );

    console.log(`Total settings in catalog: ${catalogData.size}`);
    console.log(`Child settings related to encryption/PIN: ${childSettings.length}`);

    if (childSettings.length > 0) {
      console.log('\n✅ SUCCESS! Extractor is now finding child settings!');
      console.log('\nChild settings found:');
      childSettings.forEach(([id, data]) => {
        console.log(`  - ${id.split('_').slice(-2).join('_')}: ${data.value}`);
      });
    } else {
      console.log('\n⚠️  No child settings found - extractor may still need adjustment');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedExtraction();
