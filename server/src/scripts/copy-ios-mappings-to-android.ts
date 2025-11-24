/**
 * Copy Control Mappings from iOS to Android
 *
 * Finds iOS settings and their Android equivalents, then copies control mappings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function copyMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('COPY CONTROL MAPPINGS FROM iOS TO ANDROID');
  console.log('='.repeat(80) + '\n');

  // Get all iOS settings with their control mappings
  const iosSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      isActive: true
    },
    include: {
      controlMappings: {
        include: {
          control: true
        }
      }
    }
  });

  console.log(`Found ${iosSettings.length} iOS settings\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const iosSetting of iosSettings) {
    // Skip if no mappings to copy
    if (iosSetting.controlMappings.length === 0) {
      skipCount++;
      continue;
    }

    try {
      // Find the corresponding Android setting by matching settingPath and settingName
      const androidSetting = await prisma.m365Setting.findFirst({
        where: {
          policyTemplate: '#microsoft.graph.androidManagedAppProtection',
          settingPath: iosSetting.settingPath,
          settingName: iosSetting.settingName,
          isActive: true
        },
        include: {
          controlMappings: true
        }
      });

      if (!androidSetting) {
        console.log(`⚠️  No Android equivalent for: ${iosSetting.displayName}`);
        skipCount++;
        continue;
      }

      // Skip if Android setting already has mappings
      if (androidSetting.controlMappings.length > 0) {
        console.log(`⏭️  Already has mappings: ${androidSetting.displayName}`);
        skipCount++;
        continue;
      }

      // Copy each control mapping
      for (const mapping of iosSetting.controlMappings) {
        await prisma.controlSettingMapping.create({
          data: {
            controlId: mapping.controlId,
            settingId: androidSetting.id,
            confidence: mapping.confidence,
            isRequired: mapping.isRequired,
            complianceStatus: mapping.complianceStatus,
            mappingRationale: mapping.mappingRationale,
            complianceImpact: mapping.complianceImpact,
            isActive: mapping.isActive
          }
        });
      }

      console.log(`✅ Copied ${iosSetting.controlMappings.length} mappings: ${androidSetting.displayName}`);
      const controlIds = iosSetting.controlMappings.map(m => m.control.controlId).join(', ');
      console.log(`   Controls: ${controlIds}`);
      successCount++;

    } catch (error: any) {
      console.log(`❌ Error processing ${iosSetting.displayName}: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`iOS settings processed: ${iosSettings.length}`);
  console.log(`Mappings copied: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('');

  if (successCount > 0) {
    console.log('✅ Control mappings copied successfully!');
    console.log('');
    console.log('The Android App Protection policy should now show');
    console.log('the same control mappings as iOS in the UI.');
    console.log('');
    console.log('Refresh your UI to see the changes!');
  }

  await prisma.$disconnect();
}

copyMappings().catch(console.error);
