/**
 * Inspect Settings Catalog Policy
 * Shows what data is in a Settings Catalog policy to debug extraction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectSettingsCatalog() {
  // Get the BitLocker policy as an example
  const policy = await prisma.m365Policy.findFirst({
    where: {
      policyName: {
        contains: 'BitLocker'
      }
    }
  });

  if (!policy) {
    console.log('BitLocker policy not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\n='.repeat(80));
  console.log('BITLOCKER POLICY INSPECTION');
  console.log('='.repeat(80));
  console.log(`\nPolicy: ${policy.policyName}`);
  console.log(`Type: ${policy.odataType}`);
  console.log(`\n`);

  // Parse policy data
  let policyData: any;
  try {
    policyData = typeof policy.policyData === 'string'
      ? JSON.parse(policy.policyData)
      : policy.policyData;
  } catch (error) {
    console.log('Failed to parse policy data:', error);
    await prisma.$disconnect();
    return;
  }

  console.log('Policy Data Structure:');
  console.log(`  Top-level keys: ${Object.keys(policyData).join(', ')}`);
  console.log('');

  // Check if settings array exists
  if (policyData.settings && Array.isArray(policyData.settings)) {
    console.log(`Settings array: ${policyData.settings.length} items`);
    console.log('');

    // Show first 3 settings
    for (let i = 0; i < Math.min(3, policyData.settings.length); i++) {
      const setting = policyData.settings[i];
      console.log(`\nSetting ${i + 1}:`);
      console.log(`  @odata.type: ${setting['@odata.type']}`);

      if (setting.settingInstance) {
        const instance = setting.settingInstance;
        console.log(`  settingDefinitionId: ${instance.settingDefinitionId}`);
        console.log(`  Instance type: ${instance['@odata.type']}`);

        if (instance.choiceSettingValue) {
          console.log(`  Choice value: ${instance.choiceSettingValue.value}`);
        } else if (instance.simpleSettingValue) {
          console.log(`  Simple value: ${instance.simpleSettingValue.value}`);
        } else if (instance.groupSettingCollectionValue) {
          console.log(`  Group collection value: ${JSON.stringify(instance.groupSettingCollectionValue).substring(0, 100)}...`);
        } else if (instance.groupSettingValue) {
          console.log(`  Group value: ${JSON.stringify(instance.groupSettingValue).substring(0, 100)}...`);
        }
      }
    }
  } else {
    console.log('No settings array found in policy data');
  }

  // Now check what settings in the database are mapped to this template
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE SETTINGS FOR THIS TEMPLATE');
  console.log('='.repeat(80) + '\n');

  const dbSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: policy.odataType,
      isActive: true
    },
    select: {
      id: true,
      displayName: true,
      settingName: true,
      settingPath: true
    },
    take: 10
  });

  console.log(`Found ${dbSettings.length} settings in database for template: ${policy.odataType}\n`);

  for (const s of dbSettings) {
    console.log(`  ${s.displayName}`);
    console.log(`    settingName: ${s.settingName || 'NULL'}`);
    console.log(`    settingPath: ${s.settingPath}`);
    console.log('');
  }

  await prisma.$disconnect();
}

inspectSettingsCatalog().catch(console.error);
