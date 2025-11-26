/**
 * Fix BitLocker Settings to Use Child Definition IDs
 *
 * Updates settingName fields to point to child settings that contain
 * detailed configuration values (encryption methods, PIN length, etc.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of parent setting names to child setting names
const PARENT_TO_CHILD_MAPPINGS: Record<string, { child: string; expectedValue?: string }> = {
  // Encryption Method By Drive Type (parent) → child settings for each drive type
  'device_vendor_msft_bitlocker_encryptionmethodbydrivetype': {
    child: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsosdropdown_name',
    expectedValue: '256', // Decoder returns numeric value
  },

  // System Drive Encryption Type (parent) → child with actual type
  'device_vendor_msft_bitlocker_systemdrivesencryptiontype': {
    child: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_osencryptiontypedropdown_name',
    expectedValue: '1', // Reference value for "Full encryption"
  },

  // Fixed Drive Encryption Type (parent) → child with actual type
  'device_vendor_msft_bitlocker_fixeddrivesencryptiontype': {
    child: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype_fdvencryptiontypedropdown_name',
    expectedValue: '1', // Reference value for "Full encryption"
  },

  // System Drives Minimum PIN Length (parent) → child with actual length
  'device_vendor_msft_bitlocker_systemdrivesminimumpinlength': {
    child: 'device_vendor_msft_bitlocker_systemdrivesminimumpinlength_minpinlength',
    // No expectedValue override - this is a numeric value (e.g., 6)
  },
};

async function fixBitLockerChildMapping() {
  console.log('\n' + '='.repeat(80));
  console.log('FIX BITLOCKER SETTINGS TO USE CHILD DEFINITION IDs');
  console.log('='.repeat(80) + '\n');

  let updateCount = 0;
  let createCount = 0;

  for (const [parentId, mapping] of Object.entries(PARENT_TO_CHILD_MAPPINGS)) {
    console.log(`\n📋 Processing: ${parentId}`);
    console.log(`   → Child: ${mapping.child}`);

    // Find all settings using the parent ID
    const settings = await prisma.m365Setting.findMany({
      where: { settingName: parentId },
    });

    console.log(`   Found ${settings.length} settings using parent ID`);

    for (const setting of settings) {
      console.log(`\n   Setting: ${setting.displayName}`);
      console.log(`     Current settingName: ${setting.settingName}`);
      console.log(`     Current expectedValue: ${setting.expectedValue}`);

      // For "Encryption Cipher Strength", we need to create separate settings for each drive type
      if (parentId === 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype') {
        // This parent has 3 children (OS, Fixed, Removable)
        const driveTypes = [
          {
            child: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsosdropdown_name',
            displayName: 'BitLocker Encryption Method - OS Drive',
            expectedValue: '256',
          },
          {
            child: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsfdvdropdown_name',
            displayName: 'BitLocker Encryption Method - Fixed Drive',
            expectedValue: '256',
          },
          {
            child: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsrdvdropdown_name',
            displayName: 'BitLocker Encryption Method - Removable Drive',
            expectedValue: '256',
          },
        ];

        // Update the first setting and create new ones for the others
        let isFirst = true;
        for (const driveType of driveTypes) {
          if (isFirst) {
            // Update existing setting
            await prisma.m365Setting.update({
              where: { id: setting.id },
              data: {
                settingName: driveType.child,
                displayName: driveType.displayName,
                expectedValue: driveType.expectedValue,
              },
            });
            console.log(`     ✅ Updated to: ${driveType.child}`);
            updateCount++;
            isFirst = false;
          } else {
            // Check if child setting already exists
            const existing = await prisma.m365Setting.findFirst({
              where: { settingName: driveType.child },
            });

            if (!existing) {
              // Create new setting for this drive type
              await prisma.m365Setting.create({
                data: {
                  settingName: driveType.child,
                  displayName: driveType.displayName,
                  settingPath: driveType.child,
                  policyType: setting.policyType,
                  policySubType: setting.policySubType,
                  platform: setting.platform,
                  dataType: setting.dataType,
                  expectedValue: driveType.expectedValue,
                  validationOperator: setting.validationOperator,
                  description: setting.description,
                  isActive: setting.isActive,
                  policyTemplate: setting.policyTemplate,
                  templateFamily: setting.templateFamily,
                },
              });
              console.log(`     ✅ Created new setting: ${driveType.displayName}`);
              createCount++;
            } else {
              console.log(`     ℹ️  Child setting already exists: ${driveType.displayName}`);
            }
          }
        }
      } else {
        // Simple 1:1 mapping
        await prisma.m365Setting.update({
          where: { id: setting.id },
          data: {
            settingName: mapping.child,
            ...(mapping.expectedValue && { expectedValue: mapping.expectedValue }),
          },
        });
        console.log(`     ✅ Updated settingName to: ${mapping.child}`);
        if (mapping.expectedValue) {
          console.log(`     ✅ Updated expectedValue to: ${mapping.expectedValue}`);
        }
        updateCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Settings updated: ${updateCount}`);
  console.log(`Settings created: ${createCount}`);
  console.log('='.repeat(80) + '\n');

  console.log('Next step: Re-run validation to see if values now extract correctly\n');

  await prisma.$disconnect();
}

fixBitLockerChildMapping();
